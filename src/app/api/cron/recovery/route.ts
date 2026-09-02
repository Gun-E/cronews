import { GET as runDaily } from "../daily/route";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runDaily(request);
}
