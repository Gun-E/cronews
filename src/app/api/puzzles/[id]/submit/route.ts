import { cookies } from "next/headers";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { puzzles, puzzleSubmissions } from "@/server/db/schema";
import type { PuzzleBoard } from "@/server/puzzle/types";
import { createSupabaseServerClient } from "@/server/auth/supabase";

const submissionSchema = z.object({
  answers: z.record(z.string(), z.string().max(20)),
  displayName: z.string().trim().min(1).max(20),
  elapsedSeconds: z.number().int().min(1).max(86400),
  usedHintIds: z.array(z.string().uuid()).max(30).default([]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = submissionSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "INVALID_SUBMISSION" }, { status: 400 });
  const { id } = await context.params;
  const db = getDb();
  const [puzzle] = await db.select().from(puzzles).where(and(eq(puzzles.id, id), eq(puzzles.status, "PUBLISHED"))).limit(1);
  if (!puzzle) return Response.json({ error: "PUZZLE_NOT_FOUND" }, { status: 404 });

  const cookieStore = await cookies();
  const { data: authData } = await (await createSupabaseServerClient()).auth.getUser();
  const userId = authData.user?.id;
  if (!userId && puzzle.sequenceNumber > 1) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 403 });
  let guestId = cookieStore.get("cronews_guest_id")?.value;
  if (!userId && !guestId) {
    guestId = crypto.randomUUID();
    cookieStore.set("cronews_guest_id", guestId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const playerKey = userId ? `user:${userId}` : `guest:${guestId}`;
  const board = puzzle.grid as PuzzleBoard;
  const normalized = Object.fromEntries(Object.entries(parsed.data.answers).map(([key, value]) => [key, value.normalize("NFC").replace(/\s/g, "").toUpperCase()]));
  const correctCount = board.words.filter((word) => normalized[word.id] === word.answer).length;
  const validWordIds = new Set(board.words.map((word) => word.id));
  const usedHintIds = [...new Set(parsed.data.usedHintIds)].filter((wordId) => validWordIds.has(wordId));
  const values = {
    puzzleId: puzzle.id,
    playerType: userId ? "USER" as const : "GUEST" as const,
    playerKey,
    userId: userId && /^[0-9a-f-]{36}$/i.test(userId) ? userId : null,
    displayName: userId ? (authData.user?.email?.split("@")[0] ?? userId.slice(0, 8)) : parsed.data.displayName,
    correctCount,
    totalCount: board.words.length,
    elapsedSeconds: parsed.data.elapsedSeconds,
    hintCount: usedHintIds.length,
    usedHintIds,
    answers: normalized,
    completedAt: new Date(),
  };
  await db.insert(puzzleSubmissions).values(values).onConflictDoUpdate({
    target: [puzzleSubmissions.puzzleId, puzzleSubmissions.playerKey],
    set: values,
  });
  const [ranking] = await db.select({ rank: sql<number>`count(*)::int + 1` }).from(puzzleSubmissions).where(and(
    eq(puzzleSubmissions.puzzleId, puzzle.id),
    eq(puzzleSubmissions.playerType, values.playerType),
    or(
      sql`${puzzleSubmissions.correctCount} > ${correctCount}`,
      and(eq(puzzleSubmissions.correctCount, correctCount), sql`${puzzleSubmissions.hintCount} < ${usedHintIds.length}`),
      and(eq(puzzleSubmissions.correctCount, correctCount), eq(puzzleSubmissions.hintCount, usedHintIds.length), sql`${puzzleSubmissions.elapsedSeconds} < ${parsed.data.elapsedSeconds}`),
    ),
  ));
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(puzzleSubmissions).where(and(eq(puzzleSubmissions.puzzleId, puzzle.id), eq(puzzleSubmissions.playerType, values.playerType)));
  return Response.json({ correctCount, totalCount: board.words.length, elapsedSeconds: parsed.data.elapsedSeconds, hintCount: usedHintIds.length, rank: ranking.rank, participants: total.count, playerType: values.playerType });
}
