import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Publishing a call has no staking/slashing gate yet (Tier 3), so this is the
// only spam deterrent for now: 5 calls per wallet per 10 minutes.
export const publishRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: "ratelimit:publish",
});
