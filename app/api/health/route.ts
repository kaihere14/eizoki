import { prisma } from "@/lib/prisma";
import { checkR2 } from "@/lib/services/r2";

/** Liveness probe that also verifies the Postgres and R2 connections. */
export async function GET() {
  const [database, storage] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(
      () => "connected",
      () => "unavailable",
    ),
    checkR2(),
  ]);
  const ok = database === "connected" && storage === "connected";
  return Response.json(
    { status: ok ? "ok" : "error", database, storage },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
