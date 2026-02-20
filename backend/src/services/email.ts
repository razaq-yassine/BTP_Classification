/**
 * Email service - load config, render templates, send via SMTP.
 * Uses setImmediate for async send (non-blocking). For production, consider a proper queue (Redis/BullMQ).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..", "..");
const defaultMetadataPath = path.join(backendRoot, "../frontend/public/metadata");
const METADATA_PATH = process.env.METADATA_PATH || defaultMetadataPath;
const APP_CONFIG_PATH = path.join(METADATA_PATH, "app-config.json");
const EMAIL_TEMPLATES_PATH = path.join(METADATA_PATH, "email-templates");

export interface EmailConfig {
  enabled?: boolean;
  fromEmail?: string;
  fromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
}

export interface EmailTemplate {
  key: string;
  label: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
}

function getValueAtPath(obj: Record<string, unknown>, pathStr: string): unknown {
  const parts = pathStr.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Load email config: env vars override app-config.json.
 * Env: SMTP_ENABLED, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, SMTP_FROM_NAME.
 */
export function loadEmailConfig(): EmailConfig | null {
  const fromEnv: Partial<EmailConfig> = {};
  if (process.env.SMTP_HOST) fromEnv.smtpHost = process.env.SMTP_HOST;
  if (process.env.SMTP_PORT) fromEnv.smtpPort = parseInt(process.env.SMTP_PORT, 10);
  if (process.env.SMTP_SECURE !== undefined) fromEnv.smtpSecure = process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true";
  if (process.env.SMTP_USER) fromEnv.smtpUser = process.env.SMTP_USER;
  if (process.env.SMTP_PASSWORD) fromEnv.smtpPassword = process.env.SMTP_PASSWORD;
  if (process.env.SMTP_FROM_EMAIL) fromEnv.fromEmail = process.env.SMTP_FROM_EMAIL;
  if (process.env.SMTP_FROM_NAME) fromEnv.fromName = process.env.SMTP_FROM_NAME;
  const envDisabled = process.env.SMTP_ENABLED === "0" || process.env.SMTP_ENABLED === "false";

  const envConfigured =
    !!fromEnv.smtpHost && !!fromEnv.smtpUser && !!fromEnv.smtpPassword;
  if (envConfigured) {
    return {
      enabled: !envDisabled,
      fromEmail: fromEnv.fromEmail ?? "noreply@example.com",
      fromName: fromEnv.fromName ?? "My App",
      smtpHost: fromEnv.smtpHost,
      smtpPort: fromEnv.smtpPort ?? 587,
      smtpSecure: fromEnv.smtpSecure ?? false,
      smtpUser: fromEnv.smtpUser,
      smtpPassword: fromEnv.smtpPassword,
    };
  }

  if (!fs.existsSync(APP_CONFIG_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(APP_CONFIG_PATH, "utf-8")) as Record<string, unknown>;
    const ec = data.emailConfig as EmailConfig | undefined;
    return ec && typeof ec === "object" ? ec : null;
  } catch {
    return null;
  }
}

export function loadTemplate(templateKey: string): EmailTemplate | null {
  const templatePath = path.join(EMAIL_TEMPLATES_PATH, `${templateKey}.json`);
  if (!fs.existsSync(templatePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(templatePath, "utf-8")) as Record<string, unknown>;
    return {
      key: (data.key as string) || templateKey,
      label: (data.label as string) || templateKey,
      subject: (data.subject as string) || "",
      bodyHtml: (data.bodyHtml as string) || "",
      variables: Array.isArray(data.variables) ? (data.variables as string[]) : [],
    };
  } catch {
    return null;
  }
}

/**
 * Replace {{path}} placeholders with values from variables object.
 * Supports dot notation: {{customer.firstName}} -> variables.customer.firstName
 */
export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, unknown>
): { subject: string; bodyHtml: string } {
  const replace = (str: string): string => {
    return str.replace(/\{\{([^}]+)\}\}/g, (_, pathStr: string) => {
      const val = getValueAtPath(variables, pathStr.trim());
      return val != null ? String(val) : "";
    });
  };
  return {
    subject: replace(template.subject),
    bodyHtml: replace(template.bodyHtml),
  };
}

export async function sendEmail(
  to: string,
  templateKey: string,
  variables: Record<string, unknown>
): Promise<void> {
  const config = loadEmailConfig();
  if (!config?.enabled) return;

  const template = loadTemplate(templateKey);
  if (!template) {
    console.error(`[email] Template not found: ${templateKey}`);
    return;
  }

  const { subject, bodyHtml } = renderTemplate(template, variables);

  const transporter = createTransporter(config);
  if (!transporter) {
    console.error("[email] Failed to create SMTP transporter");
    return;
  }

  try {
    await transporter.sendMail({
      from: config.fromName
        ? `"${config.fromName}" <${config.fromEmail || "noreply@example.com"}>`
        : config.fromEmail || "noreply@example.com",
      to,
      subject,
      html: bodyHtml,
    });
  } catch (err) {
    console.error("[email] Send failed:", err);
  }
}

function createTransporter(config: EmailConfig): Transporter | null {
  try {
    return nodemailer.createTransport({
      host: config.smtpHost || "localhost",
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure ?? false,
      auth:
        config.smtpUser && config.smtpPassword
          ? { user: config.smtpUser, pass: config.smtpPassword }
          : undefined,
    });
  } catch {
    return null;
  }
}

/**
 * Enqueue email for async send. Uses setImmediate to avoid blocking the request.
 * For production, consider a proper queue (Redis/BullMQ).
 */
export function enqueueEmail(
  to: string,
  templateKey: string,
  variables: Record<string, unknown>
): void {
  setImmediate(() => {
    sendEmail(to, templateKey, variables).catch((err) => {
      console.error("[email] Enqueued send failed:", err);
    });
  });
}
