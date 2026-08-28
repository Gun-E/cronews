"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Provider } from "@supabase/supabase-js";
import { useState } from "react";

export function LoginForm({ next = "/" }: { next?: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"google" | "kakao" | null>(null);

  const socialLogin = async (provider: "google" | "kakao") => {
    setLoading(provider);
    setMessage("");
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next.startsWith("/") ? next : "/");
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL!, process.env.NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY!);
    const { error } = await supabase.auth.signInWithOAuth({ provider: provider as Provider, options: { redirectTo: callback.toString() } });
    if (error) {
      setMessage(`${provider === "google" ? "Google" : "Kakao"} 로그인 설정을 확인해 주세요: ${error.message}`);
      setLoading(null);
    }
  };

  return <div className="login-card"><a href="/" className="brand"><img src="/images/logo.svg" alt="CRONEWS" /></a><span className="eyebrow">경쟁 랭킹</span><h1>간편 로그인</h1><p>사용할 계정을 선택하세요. 작성 중인 답안과 소요 시간은 로그인 후에도 그대로 유지됩니다.</p><div className="social-logins"><button className="social google" onClick={() => socialLogin("google")} disabled={Boolean(loading)}><b>G</b>{loading === "google" ? "Google 연결 중…" : "Google로 계속하기"}</button><button className="social kakao" onClick={() => socialLogin("kakao")} disabled={Boolean(loading)}><b>●</b>{loading === "kakao" ? "Kakao 연결 중…" : "카카오로 계속하기"}</button></div>{message && <p className="login-message">{message}</p>}<a href="/" className="guest-link">로그인 없이 계속하기</a></div>;
}
