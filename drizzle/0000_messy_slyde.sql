CREATE TABLE "game_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"ordering" integer NOT NULL,
	"action_data" json,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"animal" text NOT NULL,
	"is_genuine" boolean NOT NULL,
	"is_swapped" boolean DEFAULT false,
	"is_blocked" boolean DEFAULT false,
	"votes" integer DEFAULT 0,
	"vote_rank" integer
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer,
	"color" text,
	"color_code" text,
	"is_host" boolean DEFAULT false,
	"is_ready" boolean DEFAULT false,
	"is_online" boolean DEFAULT true,
	"can_action" boolean DEFAULT true,
	"attacked_rounds" integer[] DEFAULT '{}',
	"blocked_round" integer,
	"joined_at" timestamp DEFAULT now(),
	"last_active_at" timestamp DEFAULT now(),
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "game_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"phase" text NOT NULL,
	"action_order" json,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_name" text NOT NULL,
	"room_password" text NOT NULL,
	"host_id" integer NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"player_count" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	CONSTRAINT "games_room_name_unique" UNIQUE("room_name")
);
--> statement-breakpoint
CREATE TABLE "identification_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"player_id" integer NOT NULL,
	"voted_lao_chao_feng" integer,
	"voted_xu_yuan" integer,
	"voted_fang_zhen" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"provider_id" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"used_at" timestamp,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"camp" text NOT NULL,
	"skill" json NOT NULL,
	"can_check_artifact" boolean DEFAULT false,
	"can_attack" boolean DEFAULT false,
	"can_check_people" boolean DEFAULT false,
	"can_swap" boolean DEFAULT false,
	"can_block" boolean DEFAULT false,
	"can_fool" boolean DEFAULT false,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nickname" text NOT NULL,
	"password_hash" text,
	"avatar" text,
	"email_verified" boolean DEFAULT false,
	"email_verification_token" text,
	"email_verification_token_expires_at" timestamp with time zone,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_round_id_game_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."game_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_player_id_game_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."game_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_artifacts" ADD CONSTRAINT "game_artifacts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_rounds" ADD CONSTRAINT "game_rounds_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identification_votes" ADD CONSTRAINT "identification_votes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identification_votes" ADD CONSTRAINT "identification_votes_player_id_game_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."game_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identification_votes" ADD CONSTRAINT "identification_votes_voted_lao_chao_feng_game_players_id_fk" FOREIGN KEY ("voted_lao_chao_feng") REFERENCES "public"."game_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identification_votes" ADD CONSTRAINT "identification_votes_voted_xu_yuan_game_players_id_fk" FOREIGN KEY ("voted_xu_yuan") REFERENCES "public"."game_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identification_votes" ADD CONSTRAINT "identification_votes_voted_fang_zhen_game_players_id_fk" FOREIGN KEY ("voted_fang_zhen") REFERENCES "public"."game_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_room_name_idx" ON "games" USING btree ("room_name");--> statement-breakpoint
CREATE INDEX "games_status_idx" ON "games" USING btree ("status");