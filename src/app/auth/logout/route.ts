import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/auth/supabase";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
