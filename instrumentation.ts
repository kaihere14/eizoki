import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({ "service.name": "eizoki" }),
  processors:
    token && host
      ? [
          new BatchLogRecordProcessor({
            exporter: new OTLPLogExporter({
              url: `${host}/i/v1/logs`,
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              timeoutMillis: 2_000,
            }),
          }),
        ]
      : [],
});

export const posthogLogger = loggerProvider.getLogger("eizoki.posthog");

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if ((!token || !host) && process.env.NODE_ENV !== "production") {
    const missingVariable = token
      ? "NEXT_PUBLIC_POSTHOG_HOST"
      : "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN";
    console.warn(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
}

async function flush() {
  await loggerProvider.forceFlush().catch(() => {});
}

export async function logVideoSubmissionCreated(reviewStatus: string) {
  posthogLogger.emit({
    body: "video_submission_created",
    severityNumber: SeverityNumber.INFO,
    attributes: { operation: "video_submission", review_status: reviewStatus },
  });
  await flush();
}

export async function logSponsorshipBookingCreated(status: string) {
  posthogLogger.emit({
    body: "sponsorship_booking_created",
    severityNumber: SeverityNumber.INFO,
    attributes: { operation: "sponsorship_booking", status },
  });
  await flush();
}
