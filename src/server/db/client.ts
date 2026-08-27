import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_POSTGRES_URL or DATABASE_URL is required");
  const client = postgres(url, { prepare: false, max: 1 });
  cached = drizzle(client, { schema });
  return cached;
}
