import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js reads `.env.local` first, so Prisma does the same.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
