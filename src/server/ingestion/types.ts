export interface FeedArticle {
  externalId?: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt?: Date;
}

export interface FeedFetchResult {
  articles: FeedArticle[];
  etag?: string;
  lastModified?: string;
  notModified: boolean;
}
