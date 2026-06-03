import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 configuration.
// The connection URL for `prisma migrate dev` / `prisma db push` is read here
// from the DATABASE_URL environment variable (loaded from .env via dotenv).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
