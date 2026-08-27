import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  if (data.user) redirect(next.startsWith("/") ? next : "/");
  return <main className="login-page"><LoginForm next={next} /></main>;
}
