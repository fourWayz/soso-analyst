CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_wallet" text NOT NULL,
	"asset" text NOT NULL,
	"direction" text NOT NULL,
	"confidence" integer NOT NULL,
	"target_price" numeric(20, 8),
	"thesis_text" text NOT NULL,
	"thesis_hash" text NOT NULL,
	"signature" text NOT NULL,
	"horizon_hours" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolution_price" numeric(20, 8),
	"resolution_pct" double precision,
	"score" double precision,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "copy_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"follower_wallet" text NOT NULL,
	"order_id" text,
	"filled_price" numeric(20, 8),
	"fee_bps" integer,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corpus_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"asset" text NOT NULL,
	"catalyst_tags" text[],
	"regime_label" text,
	"event_day_return" double precision,
	"plus_1d" double precision,
	"plus_3d" double precision,
	"plus_7d" double precision,
	"plus_30d" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_anchors" (
	"date" text PRIMARY KEY NOT NULL,
	"merkle_root" text NOT NULL,
	"tx_hash" text,
	"call_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_wallet" text NOT NULL,
	"followed_wallet" text NOT NULL,
	"max_copy_size" numeric(20, 8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"input_snapshot" jsonb,
	"output_json" jsonb,
	"model" text NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"cost_usd" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"wallet_address" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"is_agent" boolean DEFAULT false NOT NULL,
	"reputation_score" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_author_wallet_users_wallet_address_fk" FOREIGN KEY ("author_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy_executions" ADD CONSTRAINT "copy_executions_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy_executions" ADD CONSTRAINT "copy_executions_follower_wallet_users_wallet_address_fk" FOREIGN KEY ("follower_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corpus_entries" ADD CONSTRAINT "corpus_entries_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_wallet_users_wallet_address_fk" FOREIGN KEY ("follower_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followed_wallet_users_wallet_address_fk" FOREIGN KEY ("followed_wallet") REFERENCES "public"."users"("wallet_address") ON DELETE no action ON UPDATE no action;