import { describe, expect, it } from "vitest";
import { clusterArticles, titleSimilarity } from "./cluster";

describe("article clustering", () => {
  it("groups titles sharing meaningful terms", () => {
    const articles = [
      { title: "한국은행 기준금리 동결 결정", url: "https://a.test/1" },
      { title: "기준금리 동결한 한국은행", url: "https://b.test/2" },
      { title: "프로야구 주말 경기 결과", url: "https://c.test/3" },
    ];
    expect(titleSimilarity(articles[0].title, articles[1].title)).toBeGreaterThanOrEqual(0.4);
    expect(clusterArticles(articles)).toHaveLength(2);
  });
});
