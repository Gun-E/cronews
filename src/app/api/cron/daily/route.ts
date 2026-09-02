import { timingSafeEqual } from "node:crypto";
import { runDailyIngestion } from "@/server/workflow/daily-ingestion";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || !auth?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(auth.slice(7)), expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    return Response.json({ ok: true, result: await runDailyIngestion() });
  } catch (error) {
    console.error("daily ingestion failed", error);
    return Response.json({ ok: false, error: "WORKFLOW_FAILED" }, { status: 500 });
  }
}
