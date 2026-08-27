import { count } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { newsSources } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [{ value }] = await getDb().select({ value: count() }).from(newsSources);
    return Response.json({ ok: true, sources: value });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
