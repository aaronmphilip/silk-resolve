/**
 * Apply migration 018 via Supabase SQL API (requires DATABASE_URL or direct connection).
 * Fallback: prints SQL for manual run in Supabase SQL editor.
 */
import fs from "fs";
import path from "path";

const sqlPath = path.join(process.cwd(), "supabase", "migrations", "018_agent_studio.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.log("No DATABASE_URL — paste this SQL in Supabase SQL editor:\n");
  console.log(sql);
  process.exit(0);
}

try {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Migration 018 applied successfully.");
} catch (err) {
  console.error("Migration failed:", err.message);
  console.log("\nRun manually in Supabase SQL editor:\n");
  console.log(sql);
  process.exit(1);
}