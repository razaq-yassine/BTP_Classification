/**
 * Fresh database setup: drop, create, push schema, seed.
 * Use for clean installs when migrations reference removed tables.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

const url = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/btp_classification_platform";
const match = url.match(/\/([^/?]+)(?:\?|$)/);
const dbName = match ? match[1] : "btp_classification_platform";

console.log("[db:fresh] Dropping and recreating database:", dbName);
const conn = await mysql.createConnection(url.replace(/\/[^/]+\/?(\?.*)?$/, "/"));
await conn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
await conn.execute(`CREATE DATABASE \`${dbName}\``);
await conn.end();

console.log("[db:fresh] Generating schema and pushing...");
execSync("pnpm run db:generate-from-metadata-temp", { cwd: backendRoot, stdio: "inherit" });
execSync("pnpm exec drizzle-kit push --config=./drizzle-temp/drizzle.config.ts", {
  cwd: backendRoot,
  stdio: "inherit",
});

console.log("[db:fresh] Copying schema and entity registry...");
execSync("cp drizzle-temp/db/schema.ts src/db/schema.ts", { cwd: backendRoot });
execSync("cp drizzle-temp/routes/entity-registry.generated.ts src/routes/entity-registry.generated.ts", {
  cwd: backendRoot,
});

console.log("[db:fresh] Seeding (initDb)...");
const { initDb } = await import("../src/db/init.js");
await initDb();

console.log("[db:fresh] Done. Login: admin / admin123");
