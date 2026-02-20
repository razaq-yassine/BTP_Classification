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
import { loadEmailConfig } from "../services/email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..");
const defaultMetadataPath = path.join(
  backendRoot,
  "../frontend/public/metadata"
);
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath;

const APP_CONFIG_PATH = path.join(METADATA_PATH, "app-config.json");
const ENV_PATH = path.join(backendRoot, ".env");

function getEnvValue(content: string, key: string): string | null {
  const m = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : null;
}

function updateEnvFileForSmtp(ec: Record<string, unknown>): void {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";
  const enabled = ec.enabled === true;
  const password =
    typeof ec.smtpPassword === "string" && ec.smtpPassword !== "********" && ec.smtpPassword !== ""
      ? ec.smtpPassword
      : getEnvValue(content, "SMTP_PASSWORD") ?? "";
  const updates: Record<string, string> = {
    SMTP_ENABLED: enabled ? "1" : "0",
    SMTP_HOST: String(ec.smtpHost ?? ""),
    SMTP_PORT: String(ec.smtpPort ?? 587),
    SMTP_SECURE: ec.smtpSecure === true ? "true" : "false",
    SMTP_USER: String(ec.smtpUser ?? ""),
    SMTP_PASSWORD: password,
    SMTP_FROM_EMAIL: String(ec.fromEmail ?? ""),
    SMTP_FROM_NAME: String(ec.fromName ?? ""),
  };
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      const sep = content && !content.endsWith("\n") ? "\n" : "";
      const block = !content.includes("SMTP_") ? "\n# SMTP (managed via Settings > Email)\n" : "";
      content = content + sep + block + `${key}=${value}`;
    }
  }
  fs.writeFileSync(ENV_PATH, content.trimEnd() + "\n", "utf-8");
}

type Variables = { user?: Record<string, unknown> };
export const configRoutes = new Hono<{ Variables: Variables }>();

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
  const mode = tenantConfig.mode as string;
  const hasTenants = ["single_tenant", "org_and_tenant"].includes(mode);

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

configRoutes.get("/email-ready", (c) => {
  const config = loadEmailConfig();
  const emailConfigured =
    !!config?.enabled &&
    !!config?.smtpHost &&
    !!config?.smtpUser &&
    !!config?.smtpPassword;
  return c.json({ emailConfigured });
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

function maskEmailConfig(data: Record<string, unknown>): Record<string, unknown> {
  const ec = data.emailConfig as Record<string, unknown> | undefined;
  if (!ec) return data;
  const masked = { ...ec };
  if (typeof masked.smtpPassword === "string" && masked.smtpPassword.length > 0) {
    masked.smtpPassword = "********";
  }
  return { ...data, emailConfig: masked };
}

configRoutes.get("/app-config", (c) => {
  let data: Record<string, unknown> = { defaultCurrency: "USD", currencySymbol: "$", defaultPreferredLanguage: "en" };
  if (fs.existsSync(APP_CONFIG_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    } catch {
      // keep defaults
    }
  }
  // Merge effective email config (from env or file) so UI shows what's actually used
  const effectiveEmailConfig = loadEmailConfig();
  if (effectiveEmailConfig) {
    const ec = {
      enabled: effectiveEmailConfig.enabled ?? false,
      fromEmail: effectiveEmailConfig.fromEmail ?? "noreply@example.com",
      fromName: effectiveEmailConfig.fromName ?? "My App",
      smtpHost: effectiveEmailConfig.smtpHost ?? "smtp.example.com",
      smtpPort: effectiveEmailConfig.smtpPort ?? 587,
      smtpSecure: effectiveEmailConfig.smtpSecure ?? false,
      smtpUser: effectiveEmailConfig.smtpUser ?? "",
      smtpPassword: effectiveEmailConfig.smtpPassword ?? "",
    };
    data = { ...data, emailConfig: ec };
  }
  return c.json(maskEmailConfig(data));
});

const DEFAULT_EMAIL_CONFIG = {
  enabled: false,
  fromEmail: "noreply@example.com",
  fromName: "My App",
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: ""
};

configRoutes.put("/app-config", adminOnlyMiddleware, async (c) => {
  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    const defaultCurrency =
      typeof body.defaultCurrency === "string" ? body.defaultCurrency : "USD";
    const currencySymbol =
      typeof body.currencySymbol === "string" ? body.currencySymbol : "$";
    let defaultPreferredLanguage: string | null =
      typeof body.defaultPreferredLanguage === "string" ? body.defaultPreferredLanguage : null;
    if (defaultPreferredLanguage === null && body.defaultPreferredLanguage === undefined) {
      const existing = fs.existsSync(APP_CONFIG_PATH)
        ? (JSON.parse(fs.readFileSync(APP_CONFIG_PATH, "utf-8")) as Record<string, unknown>)
        : {};
      defaultPreferredLanguage =
        typeof existing.defaultPreferredLanguage === "string" ? existing.defaultPreferredLanguage : null;
    }

    let emailConfig = DEFAULT_EMAIL_CONFIG;
    const ec = body.emailConfig as Record<string, unknown> | undefined;
    if (ec && typeof ec === "object") {
      const existing = fs.existsSync(APP_CONFIG_PATH)
        ? (JSON.parse(fs.readFileSync(APP_CONFIG_PATH, "utf-8")) as Record<string, unknown>)
        : {};
      const existingEc = (existing.emailConfig as Record<string, unknown>) || {};
      emailConfig = {
        enabled: typeof ec.enabled === "boolean" ? ec.enabled : (existingEc.enabled === true || existingEc.enabled === false ? existingEc.enabled : false),
        fromEmail: typeof ec.fromEmail === "string" ? ec.fromEmail : (typeof existingEc.fromEmail === "string" ? existingEc.fromEmail : "noreply@example.com"),
        fromName: typeof ec.fromName === "string" ? ec.fromName : (typeof existingEc.fromName === "string" ? existingEc.fromName : "My App"),
        smtpHost: typeof ec.smtpHost === "string" ? ec.smtpHost : (typeof existingEc.smtpHost === "string" ? existingEc.smtpHost : "smtp.example.com"),
        smtpPort: typeof ec.smtpPort === "number" ? ec.smtpPort : (typeof existingEc.smtpPort === "number" ? existingEc.smtpPort : 587),
        smtpSecure: typeof ec.smtpSecure === "boolean" ? ec.smtpSecure : (existingEc.smtpSecure === true || existingEc.smtpSecure === false ? existingEc.smtpSecure : false),
        smtpUser: typeof ec.smtpUser === "string" ? ec.smtpUser : (typeof existingEc.smtpUser === "string" ? existingEc.smtpUser : ""),
        smtpPassword:
          typeof ec.smtpPassword === "string" && ec.smtpPassword !== "********"
            ? ec.smtpPassword
            : (typeof existingEc.smtpPassword === "string" ? existingEc.smtpPassword : "")
      };
    }

    const data = { defaultCurrency, currencySymbol, defaultPreferredLanguage, emailConfig };
    fs.writeFileSync(APP_CONFIG_PATH, JSON.stringify(data, null, 2), "utf-8");
    // Persist SMTP to .env when emailConfig was provided (env overrides app-config)
    if (ec && typeof ec === "object") {
      updateEnvFileForSmtp(emailConfig);
    }
    return c.json(maskEmailConfig(data));
  } catch (err) {
    console.error("[config] PUT app-config error:", err);
    return c.json(
      { message: (err as Error).message || "Failed to update config" },
      500
    );
  }
});
