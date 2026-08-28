export function normalizeCellValue(value: string): string {
  return [...value.normalize("NFC")].at(-1) ?? "";
}

export function buildProgressiveHints(answer: string, hints?: string[], legacyHint?: string): string[] {
  const fillers = [
    "기사에 등장한 핵심 인물·기관·사건을 차례로 좁혀 보세요.",
    "뉴스 제목과 문제 문장의 공통 맥락을 다시 살펴보세요.",
    "가로세로로 이미 열린 글자와 기사 주제를 함께 연결해 보세요.",
    "정답과 직접 연결되는 핵심 사건을 떠올려 보세요.",
  ];
  const source = hints?.length ? hints : legacyHint ? [legacyHint] : [];
  const progressive = source.filter((hint) => !/(\d+|한|두|세|네|다섯|여섯|일곱|여덟)\s*글자|글자입니다|글자인/.test(hint));
  for (const filler of fillers) if (progressive.length < 4 && !progressive.includes(filler)) progressive.push(filler);
  return [...progressive.slice(0, 4), `정답은 ‘${answer}’입니다.`];
}
