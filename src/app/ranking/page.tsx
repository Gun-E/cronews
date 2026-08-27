import { and, asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getDb } from "@/server/db/client";
import { puzzles, puzzleSubmissions } from "@/server/db/schema";

const showTime = (seconds: number) => `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;

export default async function RankingPage() {
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  if (!data.user) redirect("/login");
  const db = getDb();
  const [today] = await db.select().from(puzzles).where(eq(puzzles.status, "PUBLISHED")).orderBy(desc(puzzles.editionDate)).limit(1);
  const rows = today ? await db.select().from(puzzleSubmissions).where(and(eq(puzzleSubmissions.puzzleId, today.id), eq(puzzleSubmissions.playerType, "USER"))).orderBy(desc(puzzleSubmissions.correctCount), asc(puzzleSubmissions.elapsedSeconds)).limit(100) : [];
  return <main className="ranking-page"><section className="ranking-shell"><header><a href="/">CRONEWS</a><span>로그인 경쟁 랭킹</span></header><div className="ranking-title"><div><span className="eyebrow">{today?.editionDate ?? "오늘"}</span><h1>오늘의 명예의 전당</h1></div><a href="/">퍼즐로 돌아가기</a></div>{rows.length ? <ol className="ranking-list">{rows.map((row, index) => <li key={row.id} className={row.userId === data.user.id ? "mine" : ""}><strong>{index + 1}</strong><span>{row.displayName}{row.userId === data.user.id && <small>나</small>}</span><b>{row.correctCount}/{row.totalCount}</b><time>{showTime(row.elapsedSeconds)}</time></li>)}</ol> : <div className="empty-ranking">아직 로그인 완주자가 없습니다. 첫 기록의 주인공이 되어보세요.</div>}</section></main>;
}
