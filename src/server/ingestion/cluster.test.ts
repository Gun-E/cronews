import { describe, expect, it } from "vitest";
import { articleSimilarity, clusterArticles, titleSimilarity } from "./cluster";

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

  it("deduplicates the same event reported by different domains", () => {
    const articles = [
      { title: "서울 시내버스 노사 협상 타결 운행 정상화", summary: "서울 버스 노사가 임금 협상을 타결해 전 노선 운행을 재개했다.", url: "https://news-a.test/story" },
      { title: "임금협상 타결…서울버스 전 노선 정상 운행", summary: "서울 시내버스 노사의 임금 협상이 타결되면서 버스 운행이 정상화됐다.", url: "https://news-b.test/article" },
      { title: "프로야구 포스트시즌 일정 확정", summary: "가을 야구 경기 일정과 구장이 발표됐다.", url: "https://sports.test/baseball" },
    ];
    expect(articleSimilarity(articles[0], articles[1])).toBeGreaterThanOrEqual(0.32);
    const clusters = clusterArticles(articles);
    expect(clusters).toHaveLength(2);
    expect(clusters.some((cluster) => cluster.length === 2)).toBe(true);
  });
});
