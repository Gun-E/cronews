"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";

export function LoginForm({ next = "/" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const login = async () => {
    setLoading(true); setMessage("");
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL!, process.env.NEXT_PUBLIC_DATABASE_SUPABASE_PUBLISHABLE_KEY!);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next.startsWith("/") ? next : "/");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callback.toString() } });
    setMessage(error ? error.message : "로그인 링크를 이메일로 보냈습니다."); setLoading(false);
  };
  return <div className="login-card"><a href="/" className="brand">CRONEWS</a><span className="eyebrow">경쟁 랭킹</span><h1>이메일로 로그인</h1><p>비밀번호 없이 받은 편지함의 링크를 누르면 로그인됩니다. 비회원 플레이 기록은 이 브라우저에 계속 남습니다.</p><label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>{message && <p className="login-message">{message}</p>}<button className="submit" onClick={login} disabled={loading || !email.includes("@")} >{loading ? "전송 중…" : "로그인 링크 받기"}</button><a href="/" className="guest-link">로그인 없이 계속하기</a></div>;
}
