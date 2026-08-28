export function normalizeCellValue(value: string): string {
  return [...value.normalize("NFC")].at(-1) ?? "";
}

export function buildProgressiveHints(answer: string, hints?: string[], legacyHint?: string): string[] {
  const progressive = (hints?.length ? hints : legacyHint ? [legacyHint] : []).slice(0, 4);
  return [...progressive, `정답은 ‘${answer}’입니다.`];
}
