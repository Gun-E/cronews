import { and, asc, desc, eq, sql } from "drizzle-orm";
import { ProfileMenu } from "@/features/profile/ProfileMenu";
import { Leaderboard, type RankRow } from "@/features/ranking/Leaderboard";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getDb } from "@/server/db/client";
import { puzzles, puzzleSubmissions, userProfiles } from "@/server/db/schema";

const showTime = (seconds: number) => `${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, "0")}초`;

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "today" } = await searchParams;
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  const db = getDb();
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const profileRows = data.user ? await db.select().from(userProfiles).where(eq(userProfiles.userId, data.user.id)).limit(1) : [];
  const myProfile = profileRows[0];
  let rows: RankRow[];
  if (tab === "overall") {
    const completedCount = sql<number>`count(distinct ${puzzleSubmissions.puzzleId})::int`, totalCorrect = sql<number>`coalesce(sum(${puzzleSubmissions.correctCount}), 0)::int`;
    const result = await db.select({ userId: puzzleSubmissions.userId, displayName: sql<string>`coalesce(${userProfiles.nickname}, ${puzzleSubmissions.displayName})`, avatarUrl: userProfiles.avatarUrl, bio: userProfiles.bio, completedCount, totalCorrect }).from(puzzleSubmissions).leftJoin(userProfiles, eq(puzzleSubmissions.userId, userProfiles.userId)).where(eq(puzzleSubmissions.playerType, "USER")).groupBy(puzzleSubmissions.userId, puzzleSubmissions.displayName, userProfiles.nickname, userProfiles.avatarUrl, userProfiles.bio).orderBy(desc(completedCount), desc(totalCorrect)).limit(100);
    rows = result.map((row) => ({ userId: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl, bio: row.bio ?? "", score: row.completedCount, detail: `${row.completedCount}개 완주 · ${row.totalCorrect}문제 정답` }));
  } else {
    const result = await db.select({ userId: puzzleSubmissions.userId, displayName: sql<string>`coalesce(${userProfiles.nickname}, ${puzzleSubmissions.displayName})`, avatarUrl: userProfiles.avatarUrl, bio: userProfiles.bio, elapsedSeconds: puzzleSubmissions.elapsedSeconds, correctCount: puzzleSubmissions.correctCount, totalCount: puzzleSubmissions.totalCount, hintCount: puzzleSubmissions.hintCount }).from(puzzleSubmissions).innerJoin(puzzles, eq(puzzleSubmissions.puzzleId, puzzles.id)).leftJoin(userProfiles, eq(puzzleSubmissions.userId, userProfiles.userId)).where(and(eq(puzzles.editionDate, editionDate), eq(puzzles.sequenceNumber, 1))).orderBy(desc(puzzleSubmissions.correctCount), asc(puzzleSubmissions.hintCount), asc(puzzleSubmissions.elapsedSeconds)).limit(100);
    rows = result.map((row) => ({ userId: row.userId, displayName: row.displayName, avatarUrl: row.avatarUrl, bio: row.bio ?? "", score: row.elapsedSeconds, detail: `${showTime(row.elapsedSeconds)} · ${row.correctCount}/${row.totalCount} 정답 · 힌트 ${row.hintCount}` }));
  }
  const nickname = myProfile?.nickname ?? data.user?.user_metadata?.full_name ?? data.user?.email?.split("@")[0];
  return <main className="ranking-page"><section className="ranking-shell"><header><a href="/" aria-label="CRONEWS 홈"><img src="/images/logo.svg" alt="CRONEWS" /></a><span>명예의 전당</span><div className="ranking-account">{data.user && nickname ? <ProfileMenu nickname={nickname} bio={myProfile?.bio} avatarUrl={myProfile?.avatarUrl} /> : <a className="login-pill" href="/login?next=/ranking">로그인</a>}{data.user && <form action="/auth/logout" method="post"><button type="submit">로그아웃</button></form>}</div></header><div className="ranking-title"><div><span className="eyebrow">CRONEWS LEAGUE</span><h1>명예의 전당</h1><p>{tab === "overall" ? "로그인 유저의 누적 완주 횟수 순위입니다." : "오늘의 크로뉴스를 정확하고 빠르게 푼 순위입니다."}</p></div><a href="/">퍼즐로 돌아가기</a></div><nav className="ranking-tabs"><a className={tab !== "overall" ? "active" : ""} href="/ranking?tab=today">오늘의 스피드</a><a className={tab === "overall" ? "active" : ""} href="/ranking?tab=overall">전체 완주왕</a></nav><Leaderboard rows={rows} currentUserId={data.user?.id} /></section></main>;
}
