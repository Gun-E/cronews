import type { RankRow } from "./Leaderboard";

const prefixes = ["새벽", "모닝", "푸른", "고요한", "느린", "달빛", "가벼운", "비오는", "오후", "한밤"];
const names = ["연필", "우체통", "페이지", "독자", "산책", "서재", "라디오", "기록", "종달새", "책갈피"];

export function previewRanks(overall: boolean, owner?: Pick<RankRow, "userId" | "avatarUrl" | "bio">): RankRow[] {
  return Array.from({ length: 100 }, (_, index) => {
    const score = overall ? 318 - index * 3 : 167 + index * 5 + (index % 4);
    const minutes = Math.floor(score / 60);
    const seconds = String(score % 60).padStart(2, "0");
    const correct = 24 - Math.floor(index / 14);
    return {
      userId: index === 0 ? owner?.userId ?? "preview-owner" : `preview-${index}`,
      displayName: index === 0 ? "강건" : `${prefixes[Math.floor(index / 10)]}${names[index % 10]}`,
      avatarUrl: index === 0 ? owner?.avatarUrl ?? null : null,
      bio: index === 0 ? owner?.bio ?? "" : "",
      score,
      detail: overall ? `${score}개 완주 · ${score * correct}문제 정답` : `${minutes}분 ${seconds}초 · ${correct}/24 정답 · 힌트 ${Math.floor((index % 14) / 4)}`,
    };
  });
}
