import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_POSTGRES_URL_NON_POOLING
      ?? process.env.DATABASE_POSTGRES_URL
      ?? process.env.DATABASE_URL
      ?? "postgres://localhost/cronews",
  },
});
