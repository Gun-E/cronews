CREATE TYPE "public"."player_type" AS ENUM('GUEST', 'USER');--> statement-breakpoint
CREATE TABLE "puzzle_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"puzzle_id" uuid NOT NULL,
	"player_type" "player_type" DEFAULT 'GUEST' NOT NULL,
	"player_key" text NOT NULL,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"correct_count" integer NOT NULL,
	"total_count" integer NOT NULL,
	"elapsed_seconds" integer NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "puzzle_submissions" ADD CONSTRAINT "puzzle_submissions_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "puzzle_submissions_player_idx" ON "puzzle_submissions" USING btree ("puzzle_id","player_key");--> statement-breakpoint
CREATE INDEX "puzzle_submissions_rank_idx" ON "puzzle_submissions" USING btree ("puzzle_id","correct_count","elapsed_seconds");