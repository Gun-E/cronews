CREATE TYPE "public"."article_status" AS ENUM('DISCOVERED', 'NORMALIZED', 'CLUSTERED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('GENERATED', 'VALIDATED', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."puzzle_status" AS ENUM('DRAFT', 'VALIDATED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."workflow_status" AS ENUM('PENDING', 'RUNNING', 'PARTIAL', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TABLE "article_cluster_members" (
	"cluster_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	CONSTRAINT "article_cluster_members_cluster_id_article_id_pk" PRIMARY KEY("cluster_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "article_clusters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"representative_title" text NOT NULL,
	"category" text,
	"cluster_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone,
	"fingerprint" text NOT NULL,
	"status" "article_status" DEFAULT 'DISCOVERED' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"homepage_url" text NOT NULL,
	"feed_url" text NOT NULL,
	"category" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"trust_weight" integer DEFAULT 50 NOT NULL,
	"etag" text,
	"last_modified" text,
	"last_fetched_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_date" text NOT NULL,
	"category" text DEFAULT 'ALL' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"seed" text NOT NULL,
	"grid" jsonb NOT NULL,
	"status" "puzzle_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cluster_id" uuid NOT NULL,
	"answer" text NOT NULL,
	"normalized_answer" text NOT NULL,
	"question" text NOT NULL,
	"hint" text NOT NULL,
	"explanation" text NOT NULL,
	"difficulty" text NOT NULL,
	"confidence" integer NOT NULL,
	"evidence" jsonb NOT NULL,
	"status" "candidate_status" DEFAULT 'GENERATED' NOT NULL,
	"prompt_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "workflow_status" DEFAULT 'PENDING' NOT NULL,
	"current_step" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_cluster_members" ADD CONSTRAINT "article_cluster_members_cluster_id_article_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."article_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_cluster_members" ADD CONSTRAINT "article_cluster_members_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_news_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."news_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_candidates" ADD CONSTRAINT "quiz_candidates_cluster_id_article_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."article_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_clusters_key_idx" ON "article_clusters" USING btree ("cluster_key");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_canonical_url_idx" ON "articles" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "articles_fingerprint_idx" ON "articles" USING btree ("fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "news_sources_feed_url_idx" ON "news_sources" USING btree ("feed_url");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_edition_category_idx" ON "puzzles" USING btree ("edition_date","category");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_runs_idempotency_idx" ON "workflow_runs" USING btree ("idempotency_key");
--> statement-breakpoint
INSERT INTO "news_sources" ("name", "homepage_url", "feed_url", "category", "trust_weight") VALUES
  ('연합뉴스', 'https://www.yna.co.kr', 'https://www.yna.co.kr/rss/news.xml', 'ALL', 90),
  ('한겨레', 'https://www.hani.co.kr', 'https://www.hani.co.kr/rss/', 'ALL', 80),
  ('동아일보', 'https://www.donga.com', 'https://rss.donga.com/total.xml', 'ALL', 80),
  ('경향신문', 'https://www.khan.co.kr', 'https://www.khan.co.kr/rss/rssdata/total_news.xml', 'ALL', 80)
ON CONFLICT ("feed_url") DO NOTHING;
