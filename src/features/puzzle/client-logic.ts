export function normalizeCellValue(value: string): string {
  return [...value.normalize("NFC")].at(-1) ?? "";
}

export function buildProgressiveHints(answer: string, hints?: string[], legacyHint?: string): string[] {
  const source = hints?.length ? hints : legacyHint ? [legacyHint] : [];
  const description = source.find((hint) => !/첫 글자|초성|정답은|출처|기사/.test(hint)) ?? legacyHint ?? "뉴스 속 핵심 인물·기관·사건을 설명하는 단어입니다.";
  const choseong = [...answer].map((character) => {
    const code = character.charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 ? [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"][Math.floor(code / 588)] : character;
  }).join("");
  return [description, `첫 글자는 ‘${[...answer][0]}’입니다.`, `초성은 ‘${choseong}’입니다.`, "이 문제의 뉴스 원문을 확인합니다.", `정답은 ‘${answer}’입니다.`];
}
