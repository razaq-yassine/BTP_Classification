import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { authRoutes } from "./routes/auth.js";
import { configRoutes } from "./routes/config.js";
import { entityRoutes } from "./routes/entities.js";
import { metadataRoutes } from "./routes/metadata.js";
import { uploadRoutes } from "./routes/upload.js";
import { fileRoutes } from "./routes/files.js";
import { recordHistoryRoutes } from "./routes/record-history.js";
import { runMigrations } from "./db/migrate.js";
import { initDb } from "./db/init.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175"
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

await runMigrations();
await initDb();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Legacy: static uploads for old file field (path-based). New attachments use /api/files/download/:fileId
app.use("/uploads/*", serveStatic({ root: path.join(__dirname, "..") }));

app.route("/api/auth", authRoutes);
app.route("/api/config", configRoutes);
app.route("/api", entityRoutes);
app.route("/api/upload", uploadRoutes);
app.route("/api/files", fileRoutes);
app.route("/api/record-history", recordHistoryRoutes);
app.route("/api/admin/metadata", metadataRoutes);

import { serve } from "@hono/node-server";

const port = Number(process.env.PORT) || 8000;
console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
