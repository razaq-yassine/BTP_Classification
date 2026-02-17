/**
 * Config routes - tenant config, app config, etc.
 * GET /api/config/tenant-config returns tenant-config.json for frontend.
 * GET /api/config/app-config returns app-config.json (default currency, etc.).
 * PUT /api/config/app-config updates app-config.json (admin only).
 */
import { Hono } from "hono";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/auth.js";
import { adminOnlyMiddleware } from "../middleware/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..");
const defaultMetadataPath = path.join(
  backendRoot,
  "../frontend/public/metadata"
);
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath;

const APP_CONFIG_PATH = path.join(METADATA_PATH, "app-config.json");

export const configRoutes = new Hono();

configRoutes.use("*", authMiddleware);

configRoutes.get("/tenant-config", (c) => {
  const configPath = path.join(METADATA_PATH, "tenant-config.json");
  if (!fs.existsSync(configPath)) {
    return c.json({ mode: "none" });
  }
  try {
    const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return c.json(data);
  } catch {
    return c.json({ mode: "none" });
  }
});

configRoutes.get("/app-config", (c) => {
  if (!fs.existsSync(APP_CONFIG_PATH)) {
    return c.json({ defaultCurrency: "USD", currencySymbol: "$" });
  }
  try {
    const data = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, "utf-8"));
    return c.json(data);
  } catch {
    return c.json({ defaultCurrency: "USD", currencySymbol: "$" });
  }
});

configRoutes.put("/app-config", adminOnlyMiddleware, async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    const defaultCurrency =
      typeof body.defaultCurrency === "string" ? body.defaultCurrency : "USD";
    const currencySymbol =
      typeof body.currencySymbol === "string" ? body.currencySymbol : "$";
    const data = { defaultCurrency, currencySymbol };
    fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
    return c.json(data);
  } catch (err) {
    console.error("[config] PUT app-config error:", err);
    return c.json(
      { message: (err as Error).message || "Failed to update config" },
      500
    );
  }
});
