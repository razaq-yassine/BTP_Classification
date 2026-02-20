import sanitizeHtml from "sanitize-html";

/**
 * Escape special characters for SQL LIKE patterns.
 * Prevents % and _ from matching unexpectedly (performance/DoS).
 */
export function escapeLikePattern(s: string): string {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`);
}

/** Max length for string/text/richText values to prevent DoS. */
export const MAX_STRING_FIELD_LENGTH = 1024 * 1024; // 1MB

const FIELDS_MAX_COUNT = 50;
const FIELD_MAX_LENGTH = 64;
const FIELD_PATTERN = /^[a-zA-Z0-9_]+$/;

/**
 * Parse and validate the fields query parameter.
 * Returns validated array or null if invalid (caller should return 400).
 */
/** Sanitize HTML for rich text fields to prevent XSS. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
      "img", "span", "div", "table", "thead", "tbody", "tr", "th", "td"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["class", "style"]
    },
    allowedSchemes: ["http", "https", "mailto"]
  });
}

/** Validate string length for entity fields. Throws if exceeded. */
export function validateStringFieldLength(val: unknown, fieldKey: string): void {
  if (typeof val === "string" && val.length > MAX_STRING_FIELD_LENGTH) {
    throw new Error(`Field "${fieldKey}" exceeds maximum length of ${MAX_STRING_FIELD_LENGTH} characters`);
  }
  if (typeof val === "object" && val !== null && Array.isArray(val)) {
    const str = JSON.stringify(val);
    if (str.length > MAX_STRING_FIELD_LENGTH) {
      throw new Error(`Field "${fieldKey}" exceeds maximum length of ${MAX_STRING_FIELD_LENGTH} characters`);
    }
  }
}

export function parseRequestedFields(fieldsParam: string | undefined): string[] | null {
  if (!fieldsParam || !fieldsParam.trim()) return null;
  const parts = fieldsParam
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length > FIELDS_MAX_COUNT) return null;
  const valid = parts.every((f) => f.length <= FIELD_MAX_LENGTH && FIELD_PATTERN.test(f));
  if (!valid) return null;
  return parts;
}
