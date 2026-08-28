import { and, eq } from "drizzle-orm";
import { PuzzleGame } from "@/features/puzzle/PuzzleGame";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import { getDb } from "@/server/db/client";
import { puzzles, puzzleSubmissions } from "@/server/db/schema";
import { generatePuzzle } from "@/server/puzzle/generator";
import type { PuzzleBoard, PuzzleInput } from "@/server/puzzle/types";

const DAILY_LIMIT = 30;
const starterInputs: PuzzleInput[] = [
  { id: "ai", answer: "인공지능", question: "인간의 학습·추론 능력을 컴퓨터로 구현하는 기술은?", hint: "AI를 우리말로 풀어 쓴 네 글자입니다." },
  { id: "economy", answer: "기준금리", question: "중앙은행이 통화 정책의 기준으로 정하는 금리는?", hint: "한국은행 금융통화위원회가 결정합니다." },
  { id: "climate", answer: "기후위기", question: "극단적 기상 현상을 심화시키는 전 지구적 문제는?", hint: "지구 온난화보다 위험성을 강조한 표현입니다." },
  { id: "satellite", answer: "인공위성", question: "지구 궤도를 돌며 통신과 관측을 수행하는 장치는?", hint: "사람이 만들어 우주로 쏘아 올린 천체입니다." },
  { id: "information", answer: "정보통신", question: "정보 처리와 원거리 전달 기술을 함께 이르는 말은?", hint: "IT와 통신 기술을 함께 부르는 네 글자입니다." },
  { id: "korea", answer: "대한민국", question: "한반도 남부에 위치한 우리나라의 정식 국호는?", hint: "네 글자의 공식 국가 명칭입니다." },
  { id: "growth", answer: "경제성장", question: "한 나라의 생산과 소득 규모가 확대되는 현상은?", hint: "GDP 증가와 관련된 네 글자입니다." },
  { id: "response", answer: "위기대응", question: "위험 상황에 맞서 피해를 줄이는 활동은?", hint: "위기 뒤에 이어지는 두 글자는 대응입니다." },
  { id: "raise", answer: "금리인상", question: "물가 안정을 위해 기준금리를 올리는 조치는?", hint: "금리를 낮추는 것의 반대입니다." },
  { id: "network", answer: "통신위성", question: "우주에서 방송과 데이터 전송을 중계하는 위성은?", hint: "통신과 위성을 합친 말입니다." },
  { id: "president", answer: "대통령", question: "대한민국 행정부를 이끄는 국가 원수는?", hint: "국민이 선거로 선출합니다." },
  { id: "rate", answer: "성장률", question: "경제 규모가 전기 대비 얼마나 늘었는지 나타내는 비율은?", hint: "성장의 정도를 백분율로 표현합니다." },
];

function makeStarterBoard(sequence: number): PuzzleBoard {
  const offset = (sequence - 1) % starterInputs.length;
  const rotated = [...starterInputs.slice(offset), ...starterInputs.slice(0, offset)];
  const candidates = [rotated.slice(0, 8), [...rotated].reverse().slice(0, 8), rotated];
  return candidates
    .map((items) => generatePuzzle(items.map((item) => ({ ...item, id: `${item.id}-${sequence}` })), 15))
    .sort((a, b) => b.words.length - a.words.length)[0];
}

async function getOrCreateDailyPuzzle(sequence: number) {
  const db = getDb();
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const [existing] = await db.select().from(puzzles).where(and(eq(puzzles.editionDate, editionDate), eq(puzzles.sequenceNumber, sequence))).limit(1);
  if (existing) {
    const board = existing.grid as PuzzleBoard;
    if (existing.seed.startsWith("daily-starter:") && board.words.some((word) => !word.hint)) {
      const hints = new Map(starterInputs.map((item) => [item.answer, item.hint]));
      const enriched = { ...board, words: board.words.map((word) => ({ ...word, hint: word.hint ?? hints.get(word.answer) })) };
      const [updated] = await db.update(puzzles).set({ grid: enriched }).where(eq(puzzles.id, existing.id)).returning();
      return updated;
    }
    return existing;
  }
  const board = makeStarterBoard(sequence);
  await db.insert(puzzles).values({ editionDate, category: `DAILY-${String(sequence).padStart(2, "0")}`, sequenceNumber: sequence, width: board.width, height: board.height, seed: `daily-starter:${editionDate}:${sequence}`, grid: board, status: "PUBLISHED", publishedAt: new Date() }).onConflictDoNothing();
  const [created] = await db.select().from(puzzles).where(and(eq(puzzles.editionDate, editionDate), eq(puzzles.sequenceNumber, sequence))).limit(1);
  return created;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ submit?: string; puzzle?: string }> }) {
  const query = await searchParams;
  const { data: authData } = await (await createSupabaseServerClient()).auth.getUser();
  const requested = Number.parseInt(query.puzzle ?? "1", 10);
  const sequence = authData.user ? Math.min(DAILY_LIMIT, Math.max(1, Number.isFinite(requested) ? requested : 1)) : 1;
  const editionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  let daily: { id: string; editionDate: string; board: PuzzleBoard } | null = null;
  let completedNumbers: number[] = [];
  try {
    const row = await getOrCreateDailyPuzzle(sequence);
    if (row) daily = { id: row.id, editionDate: row.editionDate, board: row.grid as PuzzleBoard };
    if (authData.user) {
      const completed = await getDb().select({ sequence: puzzles.sequenceNumber }).from(puzzleSubmissions).innerJoin(puzzles, eq(puzzleSubmissions.puzzleId, puzzles.id)).where(and(eq(puzzleSubmissions.playerKey, `user:${authData.user.id}`), eq(puzzles.editionDate, editionDate)));
      completedNumbers = completed.map((item) => item.sequence);
    }
  } catch (error) { console.error("daily puzzle unavailable", error); }
  const fallback = makeStarterBoard(sequence);
  return <main><PuzzleGame puzzle={daily?.board ?? fallback} puzzleId={daily?.id} editionDate={daily?.editionDate ?? editionDate} accountName={authData.user?.email?.split("@")[0]} resumeSubmission={query.submit === "pending"} sequenceNumber={sequence} dailyLimit={DAILY_LIMIT} completedNumbers={completedNumbers} /></main>;
}
