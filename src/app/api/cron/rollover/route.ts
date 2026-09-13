import { authorized } from "../daily/route";
import { prepareDailyFallback } from "@/server/workflow/daily-ingestion";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    // Runs at 23:00 KST and prepares the edition that begins one hour later.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const prepared = await prepareDailyFallback(tomorrow);
    return Response.json({ ok: prepared >= 30, prepared });
  } catch (error) {
    console.error("daily rollover failed", error);
    return Response.json({ ok: false, error: "ROLLOVER_FAILED" }, { status: 500 });
  }
}
