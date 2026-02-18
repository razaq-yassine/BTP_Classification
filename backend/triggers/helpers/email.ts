/**
 * Email notification helper for triggers.
 * Checks notification_settings, resolves recipient, and enqueues email.
 * Resolves tenant/org logo for email branding.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../../src/db/index.js";
import {
  notificationSettings,
  organizations,
  tenants,
} from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import { enqueueEmail } from "../../src/services/email.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, "..", "..", "..", "uploads");

/** Fallback logo (base64 SVG) when tenant/org has no logo set */
const FALLBACK_LOGO_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjQ4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iNDgiIGZpbGw9IiM1MjUyNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9IiNmZmZmZmYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9nbzwvdGV4dD48L3N2Zz4=";

function getMimeTypeFromExt(ext: string): string {
  const m = new Map([
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".png", "image/png"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
    [".svg", "image/svg+xml"],
  ]);
  return m.get(ext.toLowerCase()) ?? "image/png";
}

/**
 * Resolve brand context (name + logo) from organizationId/tenantId.
 * Prefers tenant over org. Logo is embedded as base64 data URL for email.
 */
export async function resolveBrandContext(
  organizationId: number | null | undefined,
  tenantId: number | null | undefined
): Promise<{ brandName: string; logoDataUrl: string }> {
  let brandName = "App";
  let logoPath: string | null = null;

  if (tenantId) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    if (tenant) {
      brandName = tenant.name;
      logoPath = tenant.logo;
    }
  }
  if (!logoPath && organizationId) {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    if (org) {
      brandName = org.name;
      logoPath = org.logo;
    }
  }

  let logoDataUrl = "";
  if (logoPath && logoPath.startsWith("/uploads/")) {
    const relativePath = logoPath.replace(/^\/uploads\//, "");
    const diskPath = path.join(UPLOADS_ROOT, relativePath);
    try {
      if (fs.existsSync(diskPath)) {
        const buf = fs.readFileSync(diskPath);
        const ext = path.extname(diskPath);
        const mime = getMimeTypeFromExt(ext);
        logoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
      }
    } catch {
      // ignore
    }
  }
  if (!logoDataUrl) {
    logoDataUrl = FALLBACK_LOGO_DATA_URL;
  }

  return { brandName, logoDataUrl };
}

export async function maybeSendNotification(
  eventKey: string,
  record: Record<string, unknown>,
  context: Record<string, unknown>
): Promise<void> {
  const [setting] = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.eventKey, eventKey));

  if (!setting?.enabled) return;

  const templateKey = setting.templateKey;
  const variables = { ...context, order: record, customer: context.customer };

  const orgId = (record.organizationId ?? context.organizationId) as
    | number
    | null
    | undefined;
  const tenantId = (record.tenantId ?? context.tenantId) as
    | number
    | null
    | undefined;
  const brand = await resolveBrandContext(orgId, tenantId);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeName = esc(brand.brandName);
  const logoOrBrand = brand.logoDataUrl
    ? `<img src="${brand.logoDataUrl}" alt="${safeName}" style="max-height:48px;max-width:180px;height:auto;display:inline-block" />`
    : `<span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">${safeName}</span>`;
  Object.assign(variables, {
    brandName: brand.brandName,
    logoDataUrl: brand.logoDataUrl,
    logoOrBrand,
  });

  let to: string | null = null;

  if (eventKey === "order_created") {
    const customer = context.customer as Record<string, unknown> | undefined;
    to = (customer?.email as string) ?? null;
  } else if (eventKey === "customer_signup") {
    to = (record.email as string) ?? null;
    Object.assign(variables, { customer: record });
  }

  if (!to || typeof to !== "string") return;

  enqueueEmail(to, templateKey, variables);
}
