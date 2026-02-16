import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.js";
import { configRoutes } from "./routes/config.js";
import { entityRoutes } from "./routes/entities.js";
import { metadataRoutes } from "./routes/metadata.js";
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

app.route("/api/auth", authRoutes);
app.route("/api/config", configRoutes);
app.route("/api", entityRoutes);
app.route("/api/admin/metadata", metadataRoutes);

import { serve } from "@hono/node-server";

const port = Number(process.env.PORT) || 8000;
console.log(`Server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
