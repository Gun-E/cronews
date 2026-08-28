DROP INDEX "puzzles_edition_category_idx";--> statement-breakpoint
ALTER TABLE "puzzles" ADD COLUMN "sequence_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_edition_sequence_idx" ON "puzzles" USING btree ("edition_date","sequence_number");