import { prisma } from "@/lib/prisma";

/** Liveness probe that also verifies the Postgres connection. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({ status: "ok", database: "connected" });
  } catch {
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503 },
    );
  }
}
