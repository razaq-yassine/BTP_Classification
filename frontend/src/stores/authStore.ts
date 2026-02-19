import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import api from '@/services/api'

/** Decode JWT payload for placeholder user when backend is unreachable */
function decodeUserFromToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
    const id = typeof payload.id === 'number' ? payload.id : 0
    const username = typeof payload.sub === 'string' ? payload.sub : 'User'
    return { id, username, email: '', firstName: '', lastName: '', profile: 'standard-user' }
  } catch {
    return null
  }
}

/**
 * User interface matching backend User entity
 */
export interface AuthUser {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  profile: string
  organizationId?: number | null
  tenantId?: number | null
  preferredLanguage?: string | null
  emailVerified?: boolean
  twoFactorEnabled?: boolean
  pendingEmail?: string | null
}

/**
 * Authentication state interface
 */
interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Authentication actions interface
 */
interface AuthActions {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

/**
 * Clean, robust authentication store
 */
export const useAuthStore = create<AuthStore>()(subscribeWithSelector((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * Login with username and password
   */
  login: async (username: string, password: string) => {
    
    set({ isLoading: true, error: null })
    
    try {
      // Make login request to backend
      const response = await api.post('/api/auth/login', {
        username,
        password
      })
      
      const { accessToken, ...userData } = response.data
      
      // Store JWT token
      localStorage.setItem('jwt_token', accessToken)
      
      // Create user object (spread to include organizationId, tenantId from backend)
      const user: AuthUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profile: userData.profile || 'standard-user',
        organizationId: userData.organizationId ?? null,
        tenantId: userData.tenantId ?? null,
        preferredLanguage: userData.preferredLanguage ?? null,
        emailVerified: userData.emailVerified ?? false,
        twoFactorEnabled: userData.twoFactorEnabled ?? false,
      }

      // Update state
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      return { success: true }
      
    } catch (error: any) {
      
      // Clear any stored token on login failure
      localStorage.removeItem('jwt_token')
      
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      })
      
      return { success: false, error: errorMessage }
    }
  },

  /**
   * Logout and clear authentication state
   */
  logout: () => {
    
    // Clear all cached data to prevent cache issues
    localStorage.clear()
    sessionStorage.clear()
    
    // Reset state
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
  },

  /**
   * Check authentication status with stored token
   */
  checkAuth: async () => {
    const token = localStorage.getItem('jwt_token')
    
    if (!token) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
      return
    }
    
    set({ isLoading: true, error: null })
    
    try {
      // Validate token with backend
      const response = await api.get('/api/auth/me')
      const userData = response.data
      
      // Create user object (spread to include organizationId, tenantId from backend)
      const user: AuthUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profile: userData.profile || 'standard-user',
        organizationId: userData.organizationId ?? null,
        tenantId: userData.tenantId ?? null,
        preferredLanguage: userData.preferredLanguage ?? null,
        emailVerified: userData.emailVerified ?? false,
        twoFactorEnabled: userData.twoFactorEnabled ?? false,
        pendingEmail: userData.pendingEmail ?? null,
      }

      // Update state
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })


    } catch (err: any) {
      const isNetworkError =
        !err.response &&
        (err.code === 'ERR_NETWORK' ||
          err.code === 'ECONNREFUSED' ||
          err.code === 'ETIMEDOUT' ||
          err.message?.includes('Network Error') ||
          err.message?.includes('Failed to fetch'))

      // Don't clear token on network errors (e.g. server restarting) - keep user logged in
      if (!isNetworkError) {
        localStorage.removeItem('jwt_token')
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
      } else {
        // Have token but backend unreachable: assume still authenticated so we don't redirect to login
        const placeholder = decodeUserFromToken(token) ?? { id: 0, username: 'User', email: '', firstName: '', lastName: '', profile: 'standard-user' }
        set({
          user: placeholder,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      }
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null })
  }
})))

// Selector helpers for components
export const selectUser = (state: AuthStore) => state.user
export const selectProfile = (state: AuthStore) => state.user?.profile || 'standard-user'
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated
export const selectIsLoading = (state: AuthStore) => state.isLoading
export const selectError = (state: AuthStore) => state.error
export const selectLogin = (state: AuthStore) => state.login
export const selectLogout = (state: AuthStore) => state.logout
