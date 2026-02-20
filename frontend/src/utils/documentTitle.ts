/**
 * Maps pathnames to translation keys for document title.
 * Used by useDocumentTitle to derive page titles.
 */
export const PATH_TITLE_MAP: Record<string, string> = {
  // Auth
  '/login': 'Sign In',
  '/sign-in': 'Sign In',
  '/sign-in-2': 'Sign In',
  '/sign-up': 'Sign Up',
  '/sign-up-2': 'Sign Up',
  '/forgot-password': 'Forgot Password',
  '/otp': 'OTP',
  '/verify-email': 'Verify Email',
  '/secure-access': 'Secure Access',
  '/login-verify-2fa': 'Verify Code',
  '/change-password-required': 'Change Password',
  '/confirm-email-change': 'Confirm Email',
  // Authenticated
  '/dashboard': 'navigation:dashboard',
  '/': 'navigation:dashboard',
  '/tasks': 'Tasks',
  '/apps': 'Apps',
  '/chats': 'Chats',
  '/help-center': 'navigation:helpCenter',
  '/files': 'navigation:fileExplorer',
  '/settings': 'navigation:settings',
  '/settings/account': 'navigation:account',
  '/settings/appearance': 'navigation:appearance',
  '/settings/email': 'navigation:email',
  '/settings/email-templates': 'navigation:emailTemplates',
  '/settings/files': 'navigation:fileExplorer',
  '/settings/notification-settings': 'navigation:notificationSettings',
  '/settings/notifications': 'Notifications',
  '/settings/object-manager': 'navigation:objectManager',
  '/settings/organization': 'navigation:organization',
  '/settings/profiles': 'navigation:permissionProfiles',
  '/settings/sidebar-assignment': 'navigation:sidebarAssignment',
  '/settings/tenant': 'navigation:tenant',
  '/settings/translations': 'navigation:translations',
  '/settings/users': 'navigation:users',
}

/**
 * Get the translation key for a pathname.
 * Tries exact match first, then strips trailing segments for nested routes
 * (e.g. /settings/users/123 → /settings/users → "Users").
 */
export function getPathTitleKey(pathname: string): string | null {
  let normalized = pathname.replace(/\/$/, '') || '/'
  while (normalized) {
    const key = PATH_TITLE_MAP[normalized]
    if (key) return key
    const lastSlash = normalized.lastIndexOf('/')
    if (lastSlash <= 0) break
    normalized = normalized.slice(0, lastSlash)
  }
  return null
}
