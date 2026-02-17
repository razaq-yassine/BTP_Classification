import { FieldDefinition } from "@/types/object-definition";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  emptyImportantFields: string[];
}

/**
 * Validates form data against field definitions
 * @param data - The form data to validate
 * @param fieldDefinitions - Array of field definitions
 * @returns ValidationResult with validation status and errors
 */
export function validateFormData(
  data: Record<string, any>,
  fieldDefinitions: FieldDefinition[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const emptyImportantFields: string[] = [];

  fieldDefinitions.forEach((field) => {
    const value = data[field.key];
    const isEmpty =
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);

    // Check required fields (master-detail fields are always required)
    const isRequired =
      field.required ||
      field.isRequired ||
      field.type === "masterDetail" ||
      field.relationshipType === "masterDetail";
    if (isRequired && isEmpty) {
      errors.push({
        field: field.key,
        message: `${field.label} is required`
      });
    }

    // Track empty important fields (but don't add as validation errors)
    if (field.isImportant && isEmpty) {
      emptyImportantFields.push(field.label);
    }

    // Type-specific validation
    if (!isEmpty) {
      switch (field.type) {
        case "email":
          if (typeof value === "string" && !isValidEmail(value)) {
            errors.push({
              field: field.key,
              message: `${field.label} must be a valid email address`
            });
          }
          break;

        case "phone":
          if (typeof value === "string" && !isValidPhone(value)) {
            errors.push({
              field: field.key,
              message: `${field.label} must be a valid phone number`
            });
          }
          break;

        case "number":
          if (typeof value !== "number" && isNaN(Number(value))) {
            errors.push({
              field: field.key,
              message: `${field.label} must be a valid number`
            });
          }
          break;

        case "date":
        case "datetime":
          if (typeof value === "string" && !isValidDate(value)) {
            errors.push({
              field: field.key,
              message: `${field.label} must be a valid date`
            });
          }
          break;

        case "url":
          if (typeof value === "string" && !isValidUrl(value)) {
            errors.push({
              field: field.key,
              message: `${field.label} must be a valid URL`
            });
          }
          break;

        case "geolocation":
          if (typeof value === "string" && value.trim() !== "") {
            try {
              const loc = JSON.parse(value);
              const lat = loc?.latitude;
              const lng = loc?.longitude;
              if (lat != null && (typeof lat !== "number" || lat < -90 || lat > 90)) {
                errors.push({
                  field: field.key,
                  message: `${field.label} latitude must be between -90 and 90`
                });
              }
              if (lng != null && (typeof lng !== "number" || lng < -180 || lng > 180)) {
                errors.push({
                  field: field.key,
                  message: `${field.label} longitude must be between -180 and 180`
                });
              }
            } catch {
              errors.push({
                field: field.key,
                message: `${field.label} must be valid geolocation data`
              });
            }
          }
          break;
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    emptyImportantFields
  };
}

/**
 * Validates an email address
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number (basic validation)
 */
function isValidPhone(phone: string): boolean {
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, "");
  // Basic validation: should have at least 7 digits
  return cleanPhone.length >= 7;
}

/**
 * Validates a date string
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validates a URL string: must have a domain (at least one dot) and no spaces.
 * Does not require http/https.
 */
function isValidUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.includes(" ")) return false;
  if (!trimmed.includes(".")) return false;
  if (!/\w/.test(trimmed)) return false;
  const parts = trimmed.split(".");
  const lastPart = parts[parts.length - 1];
  return lastPart.length >= 2 && /^[a-zA-Z0-9-]+$/.test(lastPart);
}

/**
 * Gets validation errors for a specific field
 */
export function getFieldErrors(
  fieldKey: string,
  errors: ValidationError[]
): string[] {
  return errors
    .filter((error) => error.field === fieldKey)
    .map((error) => error.message);
}
