/**
 * Shared utilities for triggers. Use for logic that is general and reusable across object helpers.
 */

export function validateEmail(email: string): void {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email address')
  }
}
