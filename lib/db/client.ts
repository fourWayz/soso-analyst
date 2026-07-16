import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Supabase's transaction-mode pooler (port 6543) does not support prepared
// statements, so they're disabled here regardless of environment.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
