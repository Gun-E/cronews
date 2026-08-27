DROP INDEX "puzzle_submissions_rank_idx";--> statement-breakpoint
ALTER TABLE "puzzle_submissions" ADD COLUMN "hint_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "puzzle_submissions" ADD COLUMN "used_hint_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "puzzle_submissions_rank_idx" ON "puzzle_submissions" USING btree ("puzzle_id","correct_count","hint_count","elapsed_seconds");