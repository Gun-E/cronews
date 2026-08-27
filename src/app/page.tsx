import { PuzzleGame } from "@/features/puzzle/PuzzleGame";
import { generatePuzzle } from "@/server/puzzle/generator";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { puzzles } from "@/server/db/schema";
import type { PuzzleBoard } from "@/server/puzzle/types";
import { createSupabaseServerClient } from "@/server/auth/supabase";

const sample = generatePuzzle([
  { id: "ai", answer: "인공지능", question: "인간의 학습·추론 능력을 컴퓨터로 구현하는 기술은?" },
  { id: "economy", answer: "기준금리", question: "중앙은행이 통화 정책의 기준으로 정하는 금리는?" },
  { id: "climate", answer: "기후위기", question: "극단적 기상 현상을 심화시키는 전 지구적 문제는?" },
  { id: "satellite", answer: "인공위성", question: "지구 궤도를 돌며 통신과 관측을 수행하는 장치는?" },
  { id: "information", answer: "정보통신", question: "정보 처리와 원거리 전달 기술을 함께 이르는 말은?" },
], 11);

export default async function Home() {
  const { data: authData } = await (await createSupabaseServerClient()).auth.getUser();
  let daily: { id: string; editionDate: string; board: PuzzleBoard } | null = null;
  try {
    const [row] = await getDb().select().from(puzzles).where(eq(puzzles.status, "PUBLISHED")).orderBy(desc(puzzles.editionDate)).limit(1);
    if (row) daily = { id: row.id, editionDate: row.editionDate, board: row.grid as PuzzleBoard };
  } catch (error) {
    console.error("daily puzzle unavailable", error);
  }
  return <main><PuzzleGame puzzle={daily?.board ?? sample} puzzleId={daily?.id} editionDate={daily?.editionDate} accountName={authData.user?.email?.split("@")[0]} /></main>;
}
