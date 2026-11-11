import { describe, expect, test } from "bun:test";

/** Run startup in isolation so its module cache and environment cannot leak. */
function bootAnalytics({
  token = "",
  host = "",
  sdkThrows = false,
}: { token?: string; host?: string; sdkThrows?: boolean } = {}) {
  const result = Bun.spawnSync(
    [
      "bun",
      "--eval",
      `
        import { mock } from "bun:test";
        const calls = [];
        const warnings = [];
        console.warn = (...args) => warnings.push(args.join(" "));
        mock.module("posthog-js", () => ({
          default: {
            init: (...args) => {
              calls.push(args);
              if (${sdkThrows}) throw new Error("SDK startup failed");
            },
          },
        }));
        await import("./instrumentation-client.ts");
        console.log(JSON.stringify({ calls, warnings }));
      `,
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: token,
        NEXT_PUBLIC_POSTHOG_HOST: host,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  expect(result.exitCode).toBe(0);
  return JSON.parse(new TextDecoder().decode(result.stdout)) as {
    calls: [string, Record<string, unknown>][];
    warnings: string[];
  };
}

describe("client instrumentation must allow the app to start", () => {
  test("missing analytics credentials do not throw before hydration", () => {
    const result = bootAnalytics();
    expect(result.calls).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  test("a missing host does not prevent startup", () => {
    const result = bootAnalytics({ token: "phc_test_token" });
    expect(result.calls).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  test("configured analytics keeps its existing options", () => {
    const result = bootAnalytics({
      token: "phc_test_token",
      host: "https://analytics.example.com",
    });
    expect(result.calls).toEqual([
      [
        "phc_test_token",
        {
          api_host: "https://analytics.example.com",
          defaults: "2026-08-30",
          capture_exceptions: true,
          debug: true,
        },
      ],
    ]);
    expect(result.warnings).toHaveLength(0);
  });

  test("an SDK initialization failure does not prevent startup", () => {
    const result = bootAnalytics({
      token: "phc_test_token",
      host: "https://analytics.example.com",
      sdkThrows: true,
    });
    expect(result.calls).toHaveLength(1);
    expect(result.warnings).toEqual([
      "PostHog initialization failed; analytics is disabled.",
    ]);
  });
});
