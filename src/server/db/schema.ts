import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const articleStatus = pgEnum("article_status", ["DISCOVERED", "NORMALIZED", "CLUSTERED", "REJECTED"]);
export const candidateStatus = pgEnum("candidate_status", ["GENERATED", "VALIDATED", "REVIEW_REQUIRED", "APPROVED", "REJECTED"]);
export const puzzleStatus = pgEnum("puzzle_status", ["DRAFT", "VALIDATED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
export const workflowStatus = pgEnum("workflow_status", ["PENDING", "RUNNING", "PARTIAL", "SUCCEEDED", "FAILED"]);

export const newsSources = pgTable("news_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  homepageUrl: text("homepage_url").notNull(),
  feedUrl: text("feed_url").notNull(),
  category: text("category"),
  enabled: boolean("enabled").notNull().default(true),
  trustWeight: integer("trust_weight").notNull().default(50),
  etag: text("etag"),
  lastModified: text("last_modified"),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("news_sources_feed_url_idx").on(table.feedUrl)]);

export const articles = pgTable("articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceId: uuid("source_id").notNull().references(() => newsSources.id),
  canonicalUrl: text("canonical_url").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  fingerprint: text("fingerprint").notNull(),
  status: articleStatus("status").notNull().default("DISCOVERED"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("articles_canonical_url_idx").on(table.canonicalUrl), index("articles_fingerprint_idx").on(table.fingerprint)]);

export const articleClusters = pgTable("article_clusters", {
  id: uuid("id").defaultRandom().primaryKey(),
  representativeTitle: text("representative_title").notNull(),
  category: text("category"),
  clusterKey: text("cluster_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("article_clusters_key_idx").on(table.clusterKey)]);

export const articleClusterMembers = pgTable("article_cluster_members", {
  clusterId: uuid("cluster_id").notNull().references(() => articleClusters.id, { onDelete: "cascade" }),
  articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.clusterId, table.articleId] })]);

export const quizCandidates = pgTable("quiz_candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  clusterId: uuid("cluster_id").notNull().references(() => articleClusters.id),
  answer: text("answer").notNull(),
  normalizedAnswer: text("normalized_answer").notNull(),
  question: text("question").notNull(),
  hint: text("hint").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: text("difficulty").notNull(),
  confidence: integer("confidence").notNull(),
  evidence: jsonb("evidence").notNull(),
  status: candidateStatus("status").notNull().default("GENERATED"),
  promptVersion: text("prompt_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const puzzles = pgTable("puzzles", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionDate: text("edition_date").notNull(),
  category: text("category").notNull().default("ALL"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  seed: text("seed").notNull(),
  grid: jsonb("grid").notNull(),
  status: puzzleStatus("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("puzzles_edition_category_idx").on(table.editionDate, table.category)]);

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: workflowStatus("status").notNull().default("PENDING"),
  currentStep: text("current_step"),
  details: jsonb("details").notNull().default({}),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("workflow_runs_idempotency_idx").on(table.idempotencyKey)]);
