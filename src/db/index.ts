import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (db) return db;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please check your .env file."
    );
  }

  const sql = neon(databaseUrl);

  db = drizzle(sql, { schema });

  return db;
}

export function isValidDatabaseUrl(url: string | undefined): boolean {
  return !!url &&
    (url.startsWith("postgres://") ||
      url.startsWith("postgresql://"));
}
