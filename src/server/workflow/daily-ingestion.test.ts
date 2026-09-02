import { describe, expect, it } from "vitest";
import { deduplicatePuzzleInputs } from "../puzzle/deduplicate";

describe("daily quiz candidate deduplication", () => {
  it("removes repeated answers and near-identical questions", () => {
    const inputs = [
      { id: "1", answer: "서울버스", question: "서울 시내버스 노사 협상 타결로 정상 운행된 핵심 교통수단은 무엇일까요?" },
      { id: "2", answer: "서울버스", question: "서울버스 협상 타결 기사에서 핵심 교통수단은 무엇일까요?" },
      { id: "3", answer: "임금협상", question: "서울 시내버스 노사 협상 타결로 정상 운행된 핵심 교통수단은 무엇일까요?" },
      { id: "4", answer: "포스트시즌", question: "프로야구 정규시즌 이후 열리는 대회는 무엇일까요?" },
    ];
    expect(deduplicatePuzzleInputs(inputs).map((input) => input.id)).toEqual(["1", "4"]);
  });
});
