import { XMLParser } from "fast-xml-parser";
import type { PuzzleBoard } from "@/server/puzzle/types";

const normalize = (word: string) => word.normalize("NFC").replace(/[\s^\-]/gu, "");
const asArray = <T>(value?: T | T[]): T[] => Array.isArray(value) ? value : value === undefined ? [] : [value];

export function dictionaryDefinition(xml: string, answer: string): string | undefined {
  type Entry = { word?: string; sense?: { definition?: string } | { definition?: string }[] };
  const parsed = new XMLParser({ parseTagValue: false }).parse(xml) as { channel?: { item?: Entry | Entry[] } };
  const matches = asArray(parsed.channel?.item).filter((item) => typeof item?.word === "string" && normalize(item.word) === normalize(answer));
  const definitions = new Set(matches.flatMap((item) => asArray(item.sense).map((sense) => sense?.definition?.trim()).filter((value): value is string => Boolean(value))));
  if (definitions.size !== 1) return;
  const [definition] = definitions;
  if (definition.length <= 240 && !/[<>]/.test(definition) && !normalize(definition).includes(normalize(answer))) return definition;
}

export async function addDictionaryHints(boards: PuzzleBoard[]): Promise<void> {
  const key = process.env.KRDICT_API_KEY?.trim();
  if (!key || !boards.length) return;
  const words = boards.flatMap((board) => board.words);
  const answers = [...new Set(words.map((word) => word.answer).filter((answer) => /^[가-힣]{2,8}$/u.test(answer)))].slice(0, 48);
  const signal = AbortSignal.timeout(2500);
  const definitions = new Map<string, string>();
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < answers.length && !signal.aborted) {
      const answer = answers[cursor++];
      try {
        const url = new URL("https://krdict.korean.go.kr/api/search");
        url.search = new URLSearchParams({ key, q: answer, part: "word" }).toString();
        const response = await fetch(url, { signal, cache: "no-store" });
        if (!response.ok) continue;
        const definition = dictionaryDefinition(await response.text(), answer);
        if (definition) definitions.set(answer, definition);
      } catch { /* The board already has an article-based clue. */ }
    }
  }));
  for (const word of words) word.dictionaryHint = definitions.get(word.answer);
}
