import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) await (await createSupabaseServerClient()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/", url.origin));
}
