import { PuzzleGame } from "@/features/puzzle/PuzzleGame";
import { generatePuzzle } from "@/server/puzzle/generator";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { puzzles } from "@/server/db/schema";
import type { PuzzleBoard } from "@/server/puzzle/types";
import { createSupabaseServerClient } from "@/server/auth/supabase";

const sample = generatePuzzle([
  { id: "ai", answer: "인공지능", question: "인간의 학습·추론 능력을 컴퓨터로 구현하는 기술은?", hint: "AI를 우리말로 풀어 쓴 네 글자입니다." },
  { id: "economy", answer: "기준금리", question: "중앙은행이 통화 정책의 기준으로 정하는 금리는?", hint: "한국은행 금융통화위원회가 결정합니다." },
  { id: "climate", answer: "기후위기", question: "극단적 기상 현상을 심화시키는 전 지구적 문제는?", hint: "지구 온난화보다 위험성을 강조한 표현입니다." },
  { id: "satellite", answer: "인공위성", question: "지구 궤도를 돌며 통신과 관측을 수행하는 장치는?", hint: "사람이 만들어 우주로 쏘아 올린 천체입니다." },
  { id: "information", answer: "정보통신", question: "정보 처리와 원거리 전달 기술을 함께 이르는 말은?", hint: "IT와 통신 기술을 함께 부르는 네 글자입니다." },
], 11);

function enrichStarterBoard(board: PuzzleBoard): PuzzleBoard {
  const hints = new Map(sample.words.map((word) => [word.id, word.hint]));
  return { ...board, words: board.words.map((word) => ({ ...word, hint: word.hint ?? hints.get(word.id) })) };
}

async function getOrCreateDailyPuzzle() {
  const db = getDb();
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const [existing] = await db.select().from(puzzles).where(eq(puzzles.editionDate, editionDate)).limit(1);
  if (existing) {
    const board = existing.grid as PuzzleBoard;
    if (existing.seed.startsWith("daily-starter:") && board.words.some((word) => !word.hint)) {
      const enriched = enrichStarterBoard(board);
      const [updated] = await db.update(puzzles).set({ grid: enriched }).where(eq(puzzles.id, existing.id)).returning();
      return updated;
    }
    return existing;
  }
  await db.insert(puzzles).values({
    editionDate,
    category: "ALL",
    width: sample.width,
    height: sample.height,
    seed: `daily-starter:${editionDate}`,
    grid: sample,
    status: "PUBLISHED",
    publishedAt: new Date(),
  }).onConflictDoNothing();
  const [created] = await db.select().from(puzzles).where(eq(puzzles.editionDate, editionDate)).limit(1);
  return created;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ submit?: string }> }) {
  const query = await searchParams;
  const { data: authData } = await (await createSupabaseServerClient()).auth.getUser();
  let daily: { id: string; editionDate: string; board: PuzzleBoard } | null = null;
  try {
    const row = await getOrCreateDailyPuzzle();
    if (row) daily = { id: row.id, editionDate: row.editionDate, board: row.grid as PuzzleBoard };
  } catch (error) {
    console.error("daily puzzle unavailable", error);
  }
  return <main><PuzzleGame puzzle={daily?.board ?? sample} puzzleId={daily?.id} editionDate={daily?.editionDate} accountName={authData.user?.email?.split("@")[0]} resumeSubmission={query.submit === "pending"} /></main>;
}
