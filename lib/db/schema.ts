import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  uuid,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  walletAddress: text("wallet_address").primaryKey(),
  displayName: text("display_name"),
  isAgent: boolean("is_agent").notNull().default(false),
  reputationScore: doublePrecision("reputation_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorWallet: text("author_wallet")
    .notNull()
    .references(() => users.walletAddress),
  asset: text("asset").notNull(),
  direction: text("direction").notNull(), // 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  confidence: integer("confidence").notNull(),
  targetPrice: numeric("target_price", { precision: 20, scale: 8 }),
  // Snapshotted server-side at publish time — the scoring baseline. Null when
  // the asset has no SoDEX market (thesis is still published, just unscored).
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }),
  thesisText: text("thesis_text").notNull(),
  thesisHash: text("thesis_hash").notNull(),
  signature: text("signature").notNull(),
  horizonHours: integer("horizon_hours").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'resolved' | 'disputed'
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  resolutionPrice: numeric("resolution_price", { precision: 20, scale: 8 }),
  resolutionPct: doublePrecision("resolution_pct"),
  score: doublePrecision("score"),
  outcome: text("outcome"), // 'HIT' | 'MISS' | 'UNSCORED' — set only once resolved
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerWallet: text("follower_wallet")
    .notNull()
    .references(() => users.walletAddress),
  followedWallet: text("followed_wallet")
    .notNull()
    .references(() => users.walletAddress),
  maxCopySize: numeric("max_copy_size", { precision: 20, scale: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const copyExecutions = pgTable("copy_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .notNull()
    .references(() => calls.id),
  followerWallet: text("follower_wallet")
    .notNull()
    .references(() => users.walletAddress),
  orderId: text("order_id"),
  filledPrice: numeric("filled_price", { precision: 20, scale: 8 }),
  feeBps: integer("fee_bps"),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyAnchors = pgTable("daily_anchors", {
  date: text("date").primaryKey(), // 'YYYY-MM-DD'
  merkleRoot: text("merkle_root").notNull(),
  txHash: text("tx_hash"),
  callCount: integer("call_count").notNull().default(0),
});

export const corpusEntries = pgTable("corpus_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .notNull()
    .references(() => calls.id),
  asset: text("asset").notNull(),
  catalystTags: text("catalyst_tags").array(),
  regimeLabel: text("regime_label"),
  eventDayReturn: doublePrecision("event_day_return"),
  plus1d: doublePrecision("plus_1d"),
  plus3d: doublePrecision("plus_3d"),
  plus7d: doublePrecision("plus_7d"),
  plus30d: doublePrecision("plus_30d"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'daily_brief' | 'asset_deep_dive' | 'theme_report'
  inputSnapshot: jsonb("input_snapshot"),
  outputJson: jsonb("output_json"),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  costUsd: doublePrecision("cost_usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
