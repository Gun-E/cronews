"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Provider } from "@supabase/supabase-js";
import { useState } from "react";

const GoogleIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.52H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.48l3.35-2.61Z"/><path fill="#EA4335" d="M12 6c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.61C7.18 7.76 9.39 6 12 6Z"/></svg>;
const KakaoIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3C6.48 3 2 6.48 2 10.78c0 2.79 1.89 5.24 4.73 6.62l-1.2 4.4c-.1.38.33.68.66.46l5.25-3.48c.18.01.37.02.56.02 5.52 0 10-3.48 10-7.78S17.52 3 12 3Z"/></svg>;

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

  return <div className="login-card"><a href="/" className="brand"><img src="/images/logo.svg" alt="CRONEWS" /></a><span className="eyebrow">CRONEWS ACCOUNT</span><h1>간편 로그인</h1><p>로그인하면 매일 30개 퍼즐, 누적 완주 랭킹과 프로필을 이용할 수 있습니다. 진행 중인 기록은 그대로 이어집니다.</p><div className="social-logins"><button className="social google" onClick={() => socialLogin("google")} disabled={Boolean(loading)}><span className="social-icon"><GoogleIcon /></span>{loading === "google" ? "Google 연결 중…" : "Google로 계속하기"}</button><button className="social kakao" onClick={() => socialLogin("kakao")} disabled={Boolean(loading)}><span className="social-icon"><KakaoIcon /></span>{loading === "kakao" ? "Kakao 연결 중…" : "카카오 로그인"}</button></div>{message && <p className="login-message">{message}</p>}<a href="/" className="guest-link">로그인 없이 오늘의 퀴즈 풀기</a><small className="login-policy">로그인 시 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다.</small></div>;
}
