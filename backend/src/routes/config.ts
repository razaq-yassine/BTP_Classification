/**
 * Config routes - tenant config, app config, etc.
 * GET /api/config/tenant-config returns tenant-config.json for frontend.
 * GET /api/config/tenant-context returns current tenant or org context (name, logo, etc.) for sidebar.
 * GET /api/config/app-config returns app-config.json (default currency, etc.).
 * PUT /api/config/app-config updates app-config.json (admin only).
 */
import { Hono } from "hono";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { adminOnlyMiddleware } from "../middleware/admin.js";
import { db } from "../db/index.js";
import { organizations, tenants } from "../db/schema.js";
import { tenantConfig } from "./entity-registry.generated.js";

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

export type TenantContext = {
  name: string;
  logoUrl?: string | null;
  subtitle?: string;
  defaultCurrency?: string | null;
  currencySymbol?: string | null;
  timezone?: string | null;
  defaultPreferredLanguage?: string | null;
  sidebarTheme?: string | null;
};

configRoutes.get("/tenant-context", async (c) => {
  const user = c.get("user") as {
    organizationId?: number | null;
    tenantId?: number | null;
    profile?: string;
  };
  const mode = tenantConfig.mode;
  const hasTenants =
    mode === "single_tenant" || mode === "org_and_tenant";

  if (user.tenantId != null && hasTenants) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId));
    if (tenant) {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, tenant.organizationId));
      const ctx: TenantContext = {
        name: tenant.name,
        logoUrl: tenant.logo ?? null,
        subtitle: org?.name,
        defaultCurrency: tenant.defaultCurrency ?? null,
        currencySymbol: tenant.currencySymbol ?? null,
        timezone: tenant.timezone ?? null,
        defaultPreferredLanguage: tenant.defaultPreferredLanguage ?? null,
        sidebarTheme: tenant.sidebarTheme ?? null,
      };
      return c.json(ctx);
    }
  }

  if (user.organizationId != null) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.organizationId));
    if (org) {
      const ctx: TenantContext = {
        name: org.name,
        logoUrl: org.logo ?? null,
        defaultCurrency: org.defaultCurrency ?? null,
        currencySymbol: org.currencySymbol ?? null,
        timezone: org.timezone ?? null,
        defaultPreferredLanguage: org.defaultPreferredLanguage ?? null,
        sidebarTheme: org.sidebarTheme ?? null,
      };
      return c.json(ctx);
    }
  }

  return c.json(null);
});

configRoutes.get("/tenant-config", (c) => {
  const configPath = path.join(METADATA_PATH, "tenant-config.json");
  if (!fs.existsSync(configPath)) {
    return c.json({ mode: "single_tenant" });
  }
  try {
    const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    // Backward compat: map deprecated modes to new ones
    const mode = data.mode === "none" ? "single_tenant" : data.mode === "tenant" ? "multi_tenant" : data.mode;
    return c.json({ ...data, mode: mode ?? "single_tenant" });
  } catch {
    return c.json({ mode: "single_tenant" });
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
