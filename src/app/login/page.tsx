import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  if (data.user) redirect("/");
  return <main className="login-page"><LoginForm /></main>;
}
