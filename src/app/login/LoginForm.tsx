"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Provider } from "@supabase/supabase-js";
import { useState } from "react";

export function LoginForm({ next = "/" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = () => {
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next.startsWith("/") ? next : "/");
    return callback.toString();
  };
  const client = () => createBrowserClient(process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL!, process.env.NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY!);
  const socialLogin = async (provider: "google" | "kakao" | "naver") => {
    setLoading(true); setMessage("");
    const { error } = await client().auth.signInWithOAuth({ provider: provider as Provider, options: { redirectTo: callbackUrl() } });
    if (error) { setMessage(`${provider === "naver" ? "네이버 Custom Provider" : provider} 설정을 확인해 주세요: ${error.message}`); setLoading(false); }
  };
  const login = async () => {
    setLoading(true); setMessage("");
    const { error } = await client().auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl() } });
    setMessage(error ? error.message : "로그인 링크를 이메일로 보냈습니다."); setLoading(false);
  };
  return <div className="login-card"><a href="/" className="brand"><img src="/images/logo.svg" alt="CRONEWS" /></a><span className="eyebrow">경쟁 랭킹</span><h1>간편 로그인</h1><p>로그인하면 제출 중인 답안은 유지되고 계정 경쟁 랭킹에 기록됩니다.</p><div className="social-logins"><button className="social google" onClick={() => socialLogin("google")} disabled={loading}><b>G</b>Google로 계속하기</button><button className="social kakao" onClick={() => socialLogin("kakao")} disabled={loading}><b>●</b>카카오로 계속하기</button><button className="social naver" onClick={() => socialLogin("naver")} disabled={loading}><b>N</b>네이버로 계속하기</button></div><div className="choice-divider"><span>또는 이메일</span></div><label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>{message && <p className="login-message">{message}</p>}<button className="submit" onClick={login} disabled={loading || !email.includes("@")} >{loading ? "연결 중…" : "이메일 로그인 링크 받기"}</button><a href="/" className="guest-link">로그인 없이 계속하기</a></div>;
}
