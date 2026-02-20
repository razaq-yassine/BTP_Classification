import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { getClientIp } from "./lib/rate-limit-utils.js";
import { authRoutes } from "./routes/auth.js";
import { configRoutes } from "./routes/config.js";
import { entityRoutes } from "./routes/entities.js";
import { metadataRoutes } from "./routes/metadata.js";
import { uploadRoutes } from "./routes/upload.js";
import { fileRoutes } from "./routes/files.js";
import { storageRoutes } from "./routes/storage.js";
import { recordHistoryRoutes } from "./routes/record-history.js";
import { searchRoutes } from "./routes/search.js";
import { emailRoutes } from "./routes/email.js";
import { runMigrations } from "./db/migrate.js";
import { initDb } from "./db/init.js";

type Variables = { user?: Record<string, unknown> };
const app = new Hono<{ Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175"
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use("*", secureHeaders());

app.use(
  "*",
  rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    keyGenerator: (c) => getClientIp(c),
  })
);

await runMigrations();
await initDb();

app.route("/api/auth", authRoutes);
app.route("/api/config", configRoutes);
app.route("/api/email", emailRoutes);
app.route("/api/search", searchRoutes);
app.route("/api", entityRoutes);
app.route("/api/upload", uploadRoutes);
app.route("/api/files", fileRoutes);
app.route("/api/storage", storageRoutes);
app.route("/api/record-history", recordHistoryRoutes);
app.route("/api/admin/metadata", metadataRoutes);

import { serve } from "@hono/node-server";

const port = Number(process.env.PORT) || 8000;
console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
