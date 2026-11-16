import { expect, it, vi } from "vitest";
import { availablePuzzleHints } from "../../features/puzzle/client-logic";
import type { PuzzleBoard } from "@/server/puzzle/types";
import { addDictionaryHints, dictionaryDefinition } from "./korean-dictionary";

it("accepts a single exact definition and skips ambiguous or answer-revealing matches", () => {
  const entry = (word: string, definition: string) => `<item><word>${word}</word><sense><definition>${definition}</definition></sense></item>`;
  const results = (...items: string[]) => `<channel>${items.join("")}</channel>`;
  const definition = "정해진 시간 안에 승부가 나지 않아 추가로 치르는 경기.";
  const exact = entry("연장전", definition);
  expect(dictionaryDefinition(results(entry("연장", "길이를 늘림."), exact), "연장전")).toBe(definition);
  expect(dictionaryDefinition(results(exact, entry("연장전", "다른 뜻.")), "연장전")).toBeUndefined();
  expect(dictionaryDefinition(results(entry("연장전", "연장전을 치르는 경기.")), "연장전")).toBeUndefined();
});

it("keeps meaningful level-one hints when the dictionary misses or times out", async () => {
  const board: PuzzleBoard = {
    width: 2, height: 2, cells: [], intersections: 0,
    words: [
      { id: "team", answer: "소노", question: "“[프로농구] ○○ 89-83 DB”", row: 0, col: 0, direction: "ACROSS" },
      { id: "name", answer: "가상진", question: "새 감독은 누구인가요?", hint: "이번 시즌부터 구단의 선수단을 지휘하는 인물입니다.", row: 0, col: 0, direction: "DOWN" },
    ],
  };
  vi.stubEnv("KRDICT_API_KEY", "test-key");
  const lookup = vi.fn()
    .mockResolvedValueOnce(new Response("<channel><total>0</total></channel>"))
    .mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"));
  vi.stubGlobal("fetch", lookup);
  try {
    await addDictionaryHints([board]);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(availablePuzzleHints(board.words[0])[0]).toMatchObject({ id: "team:1", text: expect.stringContaining("앞에 나온 점수를 기록한 쪽") });
    expect(availablePuzzleHints(board.words[1])[0]).toMatchObject({ id: "name:1", text: board.words[1].hint });
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
