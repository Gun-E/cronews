import type { PuzzleInput } from "@/server/puzzle/types";

export function normalizeCellValue(value: string): string {
  return [...value.normalize("NFC")].at(-1) ?? "";
}

export function resolveEntryPositions(characterCount: number, answerLength: number, emptyTargets: number[]): number[] {
  return characterCount === answerLength ? Array.from({ length: answerLength }, (_, index) => index) : emptyTargets;
}

const glossary = new Map([
  ["인공지능", "학습이나 판단처럼 사람의 지능이 필요한 일을 컴퓨터가 수행하도록 하는 기술."],
  ["기준금리", "중앙은행이 통화정책을 운영할 때 기준으로 삼는 이자율."],
  ["물가상승률", "상품과 서비스의 전반적인 가격 수준이 일정 기간에 얼마나 올랐는지 나타내는 비율."],
  ["추가경정예산", "이미 확정한 국가 예산을 새로 생긴 지출이나 수입 변화에 맞춰 고친 예산."],
  ["탄소중립", "온실가스 배출량에서 흡수하거나 제거한 양을 빼 순배출량을 0으로 만드는 상태."],
  ["연장전", "정해진 경기 시간 안에 승부가 나지 않았을 때 추가로 치르는 경기."],
]);

function describeHeadlineClue(question: string): string {
  const headline = question.split(/[“”]/)[1] ?? question;
  const [, after = ""] = headline.split(/○+/u);
  const suffix = after.trimStart();
  if (/^(?:을|를)\s/u.test(suffix)) return "기사에서 누군가 행동을 하거나 결정을 내릴 때, 그 행동이 향하는 대상입니다.";
  if (/^(?:에서|에서는)\s/u.test(suffix)) return "기사 속 일이 벌어진 장소나, 그 일이 진행된 조직·행사 등 배경을 가리킵니다.";
  if (/^(?:이|가|은|는)\s/u.test(suffix)) return "기사에서 뒤에 이어지는 행동을 하거나 변화를 겪는 중심 주체입니다.";
  if (/^(?:의)\s/u.test(suffix)) return "빈칸 다음에 나오는 대상이 누구에게 속하거나 무엇과 관련되는지 알려 주는 표현입니다.";
  if (/(?:프로농구|프로야구|프로축구|경기|승리|득점)/u.test(headline) && /\d+\s*[-:–]\s*\d+/u.test(suffix)) {
    return "점수 앞에 놓인 팀 이름입니다. 두 점수 중 앞에 나온 점수를 기록한 쪽을 찾아보세요.";
  }
  return "빈칸 뒤에 설명된 사건과 가장 직접적으로 연결되는 핵심 표현을 찾아보세요. 문장 안에서 어떤 역할을 하는지 살펴보면 범위를 좁힐 수 있어요.";
}

export function buildProgressiveHints(answer: string, hints?: string[], legacyHint?: string, question = ""): (string | undefined)[] {
  const normalize = (value: string) => value.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const headline = normalize(question.split(/[“”]/)[1] ?? question);
  const description = [hints?.[0], legacyHint].find((hint) => {
    if (!hint || /첫\s*글자|초성|마지막 한글 글자|모음은|정답은|뉴스 원문|뉴스 맥락|빈칸|글자\s*수|○/.test(hint)) return false;
    const normalized = normalize(hint);
    return normalized.length > 0 && !normalized.includes(normalize(answer))
      && !(headline.length >= 6 && normalized.includes(headline))
      && !normalize(question).includes(normalized);
  });
  const choseong = [...answer].map((character) => {
    const code = character.charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 ? [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"][Math.floor(code / 588)] : character;
  }).join("");
  const definition = glossary.get(answer.normalize("NFC").replace(/\s/g, ""));
  return [definition ?? description ?? describeHeadlineClue(question), `첫 글자는 ‘${[...answer][0]}’입니다.`, `초성은 ‘${choseong}’입니다.`, "이 문제의 뉴스 원문을 확인합니다.", `정답은 ‘${answer}’입니다.`];
}

export function availablePuzzleHints(word: PuzzleInput) {
  return buildProgressiveHints(word.answer, word.hints, word.hint, word.question).flatMap((text, index) => {
    const level = index + 1;
    return text ? [{ id: `${word.id}:${level}`, level, text: level === 1 ? word.dictionaryHint ?? text : text }] : [];
  });
}

export function newsSearchUrl(word: PuzzleInput): string {
  const headline = word.explanation?.match(/^원문 기사 제목은 “([^”]+)”/u)?.[1]
    ?? (word.question.split(/[“”]/)[1] ?? word.question).replace(/○+/gu, " ").replace(/\s+/gu, " ").trim();
  return `https://news.google.com/search?${new URLSearchParams({ q: headline || word.answer, hl: "ko", gl: "KR", ceid: "KR:ko" })}`;
}
