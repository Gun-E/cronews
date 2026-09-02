import { GET as runDaily } from "../daily/route";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  return runDaily(request);
}
