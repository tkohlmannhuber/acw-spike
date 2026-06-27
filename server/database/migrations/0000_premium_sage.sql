CREATE TYPE "public"."match_phase" AS ENUM('group', 'ko', 'third_place');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('pending', 'live', 'finished');--> statement-breakpoint
CREATE TYPE "public"."next_match_slot" AS ENUM('a', 'b');--> statement-breakpoint
CREATE TYPE "public"."score_mode" AS ENUM('single_game', 'best_of_3');--> statement-breakpoint
CREATE TYPE "public"."tournament_format" AS ENUM('groups_then_ko', 'round_robin_only', 'single_elim_only');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('setup', 'draw_done', 'group_stage', 'ko_stage', 'finished');--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"phase" "match_phase" NOT NULL,
	"pool_id" uuid,
	"round" integer,
	"bracket_position" integer,
	"team_a_id" uuid,
	"team_b_id" uuid,
	"score_a" integer,
	"score_b" integer,
	"winner_id" uuid,
	"status" "match_status" DEFAULT 'pending' NOT NULL,
	"next_match_id" uuid,
	"next_match_slot" "next_match_slot"
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_substitute" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"player1_id" uuid NOT NULL,
	"player2_id" uuid,
	"player3_id" uuid,
	"pool_id" uuid,
	"seed" integer
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" timestamp NOT NULL,
	"format" "tournament_format" DEFAULT 'groups_then_ko' NOT NULL,
	"status" "tournament_status" DEFAULT 'setup' NOT NULL,
	"pool_count" integer DEFAULT 2 NOT NULL,
	"qualifiers_per_pool" integer DEFAULT 2 NOT NULL,
	"score_mode" "score_mode" DEFAULT 'single_game' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_teams_id_fk" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_teams_id_fk" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_teams_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_next_match_id_matches_id_fk" FOREIGN KEY ("next_match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pools" ADD CONSTRAINT "pools_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_player1_id_players_id_fk" FOREIGN KEY ("player1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_player2_id_players_id_fk" FOREIGN KEY ("player2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_player3_id_players_id_fk" FOREIGN KEY ("player3_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_pool_id_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."pools"("id") ON DELETE no action ON UPDATE no action;