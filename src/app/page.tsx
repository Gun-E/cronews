import { and, eq } from "drizzle-orm";
import { PuzzleGame } from "@/features/puzzle/PuzzleGame";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getDb } from "@/server/db/client";
import { puzzles, puzzleSubmissions, userProfiles } from "@/server/db/schema";
import type { PuzzleBoard } from "@/server/puzzle/types";
import { NEWS_QUIZ_PROMPT_VERSION } from "@/server/llm/news-prompt";

const DAILY_LIMIT = 30;

export default async function Home({ searchParams }: { searchParams: Promise<{ submit?: string; puzzle?: string }> }) {
  const query = await searchParams;
  const { data: authData } = await (await createSupabaseServerClient()).auth.getUser();
  const requested = Number.parseInt(query.puzzle ?? "1", 10);
  const sequence = authData.user ? Math.min(DAILY_LIMIT, Math.max(1, Number.isFinite(requested) ? requested : 1)) : 1;
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const db = getDb();
  let daily: { id: string; editionDate: string; board: PuzzleBoard } | null = null;
  let completedNumbers: number[] = [];
  let profile: typeof userProfiles.$inferSelect | undefined;
  try {
    const [row] = await db.select().from(puzzles).where(and(eq(puzzles.editionDate, editionDate), eq(puzzles.sequenceNumber, sequence), eq(puzzles.status, "PUBLISHED"))).limit(1);
    if (row?.seed.includes(NEWS_QUIZ_PROMPT_VERSION)) daily = { id: row.id, editionDate: row.editionDate, board: row.grid as PuzzleBoard };
    if (authData.user) {
      [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, authData.user.id)).limit(1);
      const completed = await db.select({ sequence: puzzles.sequenceNumber }).from(puzzleSubmissions).innerJoin(puzzles, eq(puzzleSubmissions.puzzleId, puzzles.id)).where(and(eq(puzzleSubmissions.playerKey, `user:${authData.user.id}`), eq(puzzles.editionDate, editionDate)));
      completedNumbers = completed.map((item) => item.sequence);
    }
  } catch (error) { console.error("daily puzzle unavailable", error); }

  if (!daily) return <main className="unavailable-page"><section><img src="/images/logo.svg" alt="CRONEWS" /><span>오늘의 뉴스 퀴즈 준비 중</span><h1>새 퍼즐을 만들고 있어요.</h1><p>매일 오전 5시에 수집한 뉴스로 모든 사용자가 함께 푸는 문제를 미리 생성합니다. 잠시 후 다시 확인해 주세요.</p></section></main>;

  const accountName = profile?.nickname ?? authData.user?.user_metadata?.full_name ?? authData.user?.email?.split("@")[0];
  return <main><PuzzleGame puzzle={daily.board} puzzleId={daily.id} editionDate={daily.editionDate} accountName={accountName} accountBio={profile?.bio} accountAvatar={profile?.avatarUrl} resumeSubmission={query.submit === "pending"} sequenceNumber={sequence} dailyLimit={DAILY_LIMIT} completedNumbers={completedNumbers} /></main>;
}
