import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "../config.js";
import { MIGRATE_SQL } from "./migrate-sql.js";
import * as schema from "./schema.js";

export type Db = PostgresJsDatabase<typeof schema>;

let sql: ReturnType<typeof postgres> | null = null;
let db: Db | null = null;

export function getDb(): Db | null {
  return db;
}

export function isPostgresEnabled(): boolean {
  return Boolean(config.databaseUrl);
}

export async function initDatabase(): Promise<Db | null> {
  if (!config.databaseUrl) {
    db = null;
    return null;
  }
  if (db) return db;

  sql = postgres(config.databaseUrl, { max: 10 });
  db = drizzle(sql, { schema });
  await sql.unsafe(MIGRATE_SQL);
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = null;
    db = null;
  }
}
