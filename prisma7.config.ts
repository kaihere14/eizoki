import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads `.env.local` first, so Prisma does the same. Both files are
// optional: on a build machine only the platform environment exists.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read through process.env rather than env() so `prisma generate` works at
    // build time before a database is connected. Migrate/db commands still
    // require the variable and fail with a clear Prisma error when it is unset.
    url: process.env.DATABASE_URL,
  },
});
