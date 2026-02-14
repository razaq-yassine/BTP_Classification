import { migrate } from "drizzle-orm/mysql2/migrator";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL || "mysql://root:root@localhost:3306/generic_saas";
  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection);
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
  await connection.end();
}

// CLI: tsx src/db/migrate.ts
if (process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations()
    .then(() => {
      console.log("Migrations complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
