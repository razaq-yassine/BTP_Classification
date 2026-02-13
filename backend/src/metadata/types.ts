export interface ValidationError {
  path: string
  message: string
  code?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export function addError(
  errors: ValidationError[],
  path: string,
  message: string,
  code?: string
): void {
  errors.push({ path, message, code })
}
