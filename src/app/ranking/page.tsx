import { and, asc, desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getDb } from "@/server/db/client";
import { puzzles, puzzleSubmissions } from "@/server/db/schema";

const DAILY_LIMIT = 30;
const showTime = (seconds: number) => `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;

export default async function RankingPage() {
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  if (!data.user) redirect("/login");
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const completedCount = sql<number>`count(distinct ${puzzleSubmissions.puzzleId})::int`;
  const totalCorrect = sql<number>`coalesce(sum(${puzzleSubmissions.correctCount}), 0)::int`;
  const totalHints = sql<number>`coalesce(sum(${puzzleSubmissions.hintCount}), 0)::int`;
  const totalSeconds = sql<number>`coalesce(sum(${puzzleSubmissions.elapsedSeconds}), 0)::int`;
  const rows = await getDb().select({ userId: puzzleSubmissions.userId, displayName: puzzleSubmissions.displayName, completedCount, totalCorrect, totalHints, totalSeconds }).from(puzzleSubmissions).innerJoin(puzzles, eq(puzzleSubmissions.puzzleId, puzzles.id)).where(and(eq(puzzleSubmissions.playerType, "USER"), eq(puzzles.editionDate, editionDate))).groupBy(puzzleSubmissions.userId, puzzleSubmissions.displayName).orderBy(desc(completedCount), desc(totalCorrect), asc(totalHints), asc(totalSeconds)).limit(100);

  return <main className="ranking-page"><section className="ranking-shell"><header><a href="/" aria-label="CRONEWS 홈"><img src="/images/logo.svg" alt="CRONEWS" /></a><span>로그인 경쟁 랭킹</span><form action="/auth/logout" method="post"><button type="submit">로그아웃</button></form></header><div className="ranking-title"><div><span className="eyebrow">{editionDate}</span><h1>오늘의 완주 랭킹</h1><p>많이 푼 순서로 순위가 결정됩니다.</p></div><a href="/">퍼즐로 돌아가기</a></div>{rows.length ? <ol className="ranking-list aggregate">{rows.map((row, index) => <li key={row.userId ?? row.displayName} className={row.userId === data.user.id ? "mine" : ""}><strong>{index + 1}</strong><span>{row.displayName}{row.userId === data.user.id && <small>나</small>}</span><b>{row.completedCount}/{DAILY_LIMIT}개 완료</b><time>{row.totalCorrect}문제 정답 · 힌트 {row.totalHints} · {showTime(row.totalSeconds)}</time></li>)}</ol> : <div className="empty-ranking">아직 로그인 완주자가 없습니다. 첫 퍼즐을 완료해보세요.</div>}</section></main>;
}
