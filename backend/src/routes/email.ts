/**
 * Email routes - templates CRUD, preview, notification settings.
 * All routes require auth; admin-only for write operations.
 */
import { Hono } from "hono";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { adminOnlyMiddleware } from "../middleware/admin.js";
import { db } from "../db/index.js";
import { notificationSettings } from "../db/schema.js";
import {
  loadTemplate,
  renderTemplate,
  type EmailTemplate,
} from "../services/email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..");
const defaultMetadataPath = path.join(
  backendRoot,
  "../frontend/public/metadata"
);
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath;
const EMAIL_TEMPLATES_PATH = path.join(METADATA_PATH, "email-templates");
const NOTIFICATION_EVENTS_PATH = path.join(
  METADATA_PATH,
  "notification-events.json"
);

export const emailRoutes = new Hono();

emailRoutes.use("*", authMiddleware);

// List all templates
emailRoutes.get("/templates", (c) => {
  if (!fs.existsSync(EMAIL_TEMPLATES_PATH)) {
    return c.json([]);
  }
  const files = fs.readdirSync(EMAIL_TEMPLATES_PATH).filter((f) => f.endsWith(".json"));
  const templates: EmailTemplate[] = [];
  for (const file of files) {
    const key = file.replace(/\.json$/, "");
    const template = loadTemplate(key);
    if (template) templates.push(template);
  }
  return c.json(templates);
});

// Get one template
emailRoutes.get("/templates/:key", (c) => {
  const key = c.req.param("key");
  const template = loadTemplate(key);
  if (!template) return c.json({ message: "Template not found" }, 404);
  return c.json(template);
});

// Update template (admin only)
emailRoutes.put("/templates/:key", adminOnlyMiddleware, async (c) => {
  const key = c.req.param("key");
  const templatePath = path.join(EMAIL_TEMPLATES_PATH, `${key}.json`);
  if (!fs.existsSync(templatePath)) {
    return c.json({ message: "Template not found" }, 404);
  }
  try {
    const body = (await c.req.json()) as Record<string, unknown>;
    const label = typeof body.label === "string" ? body.label : "";
    const subject = typeof body.subject === "string" ? body.subject : "";
    const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml : "";
    const variables = Array.isArray(body.variables)
      ? (body.variables as string[]).filter((v) => typeof v === "string")
      : [];

    const data = { key, label, subject, bodyHtml, variables };
    fs.mkdirSync(path.dirname(templatePath), { recursive: true });
    fs.writeFileSync(templatePath, JSON.stringify(data, null, 2), "utf-8");
    return c.json(data);
  } catch (err) {
    console.error("[email] PUT template error:", err);
    return c.json(
      { message: (err as Error).message || "Failed to update template" },
      500
    );
  }
});

// Preview template with sample data
emailRoutes.post("/preview", async (c) => {
  try {
    const body = (await c.req.json()) as {
      templateKey?: string;
      sampleData?: Record<string, unknown>;
    };
    const templateKey = body.templateKey;
    const sampleData = body.sampleData || {};
    if (!templateKey || typeof templateKey !== "string") {
      return c.json({ message: "templateKey required" }, 400);
    }
    const template = loadTemplate(templateKey);
    if (!template) return c.json({ message: "Template not found" }, 404);
    const { subject, bodyHtml } = renderTemplate(template, sampleData);
    return c.json({ subject, bodyHtml });
  } catch (err) {
    console.error("[email] Preview error:", err);
    return c.json(
      { message: (err as Error).message || "Preview failed" },
      500
    );
  }
});

// Load notification events catalog
function loadNotificationEvents(): Array<{
  key: string;
  label: string;
  description: string;
  defaultTemplateKey: string;
}> {
  if (!fs.existsSync(NOTIFICATION_EVENTS_PATH)) return [];
  try {
    const data = JSON.parse(
      fs.readFileSync(NOTIFICATION_EVENTS_PATH, "utf-8")
    ) as Array<unknown>;
    return (data || []).filter(
      (e): e is { key: string; label: string; description: string; defaultTemplateKey: string } =>
        e != null &&
        typeof e === "object" &&
        typeof (e as Record<string, unknown>).key === "string"
    ) as Array<{
      key: string;
      label: string;
      description: string;
      defaultTemplateKey: string;
    }>;
  } catch {
    return [];
  }
}

// Get notification settings (admin only)
emailRoutes.get("/notification-settings", adminOnlyMiddleware, async (c) => {
  const events = loadNotificationEvents();
  const rows = await db.select().from(notificationSettings);
  const byEvent = new Map(rows.map((r) => [r.eventKey, r]));

  const result = events.map((ev) => {
    const row = byEvent.get(ev.key);
    return {
      eventKey: ev.key,
      label: ev.label,
      description: ev.description,
      defaultTemplateKey: ev.defaultTemplateKey,
      enabled: row?.enabled ?? false,
      templateKey: row?.templateKey ?? ev.defaultTemplateKey,
    };
  });
  return c.json(result);
});

// Bulk update notification settings (admin only)
emailRoutes.put("/notification-settings", adminOnlyMiddleware, async (c) => {
  try {
    const body = (await c.req.json()) as Array<{
      eventKey: string;
      enabled?: boolean;
      templateKey?: string;
    }>;
    if (!Array.isArray(body)) {
      return c.json({ message: "Body must be an array" }, 400);
    }
    for (const item of body) {
      const eventKey = item.eventKey;
      if (!eventKey || typeof eventKey !== "string") continue;

      const [existing] = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.eventKey, eventKey));

      const enabled = typeof item.enabled === "boolean" ? item.enabled : existing?.enabled ?? false;
      const templateKey =
        typeof item.templateKey === "string"
          ? item.templateKey
          : existing?.templateKey ?? eventKey;

      if (existing) {
        await db
          .update(notificationSettings)
          .set({ enabled, templateKey })
          .where(eq(notificationSettings.eventKey, eventKey));
      } else {
        await db.insert(notificationSettings).values({
          eventKey,
          enabled,
          templateKey,
        });
      }
    }
    const rows = await db.select().from(notificationSettings);
    return c.json(rows);
  } catch (err) {
    console.error("[email] PUT notification-settings error:", err);
    return c.json(
      { message: (err as Error).message || "Failed to update" },
      500
    );
  }
});
