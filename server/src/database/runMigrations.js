import { Client } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "..", "..", "migrations");

const getDbConfig = () => {
  const sslEnabled = String(process.env.DB_SSL || "false").toLowerCase() === "true";
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "passdesk",
    user: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "",
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  };
};

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query("SELECT filename FROM schema_migrations");
  return new Set(result.rows.map((row) => row.filename));
};

const getMigrationFiles = () => {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
};

const applyMigration = async (client, filename) => {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, "utf8");
  if (!sql.trim()) {
    return;
  }

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
      filename,
    ]);
    await client.query("COMMIT");
    console.log(`✅ Applied migration: ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ Migration failed: ${filename}`);
    throw error;
  }
};

const runMigrations = async () => {
  const client = new Client(getDbConfig());
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = getMigrationFiles();

    for (const filename of files) {
      if (applied.has(filename)) {
        continue;
      }
      await applyMigration(client, filename);
    }
  } finally {
    await client.end();
  }
};

runMigrations().catch((error) => {
  console.error("❌ Migration runner error:", error.message);
  process.exit(1);
});
