import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import api from '@/services/api'

/**
 * User interface matching backend User entity
 */
export interface AuthUser {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
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
    console.log('🔐 Starting login process for user:', username)
    
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
      console.log('✅ JWT token stored successfully')
      
      // Create user object
      const user: AuthUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
      
      // Update state
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
      
      console.log('🎉 Login successful for user:', user.username)
      return { success: true }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error)
      
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
    console.log('🚺 Logging out user')
    
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
    
    console.log('✅ Logout completed - all cache cleared')
  },

  /**
   * Check authentication status with stored token
   */
  checkAuth: async () => {
    const token = localStorage.getItem('jwt_token')
    
    if (!token) {
      console.log('📭 No JWT token found - user not authenticated')
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
      return
    }
    
    console.log('🔍 Checking authentication with stored token')
    set({ isLoading: true, error: null })
    
    try {
      // Validate token with backend
      const response = await api.get('/api/auth/me')
      const userData = response.data
      
      // Create user object
      const user: AuthUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
      
      // Update state
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
      
      console.log('✅ Authentication check successful for user:', user.username)
      
    } catch (error: any) {
      console.warn('⚠️ Authentication check failed:', error.message)
      
      // Clear invalid token
      localStorage.removeItem('jwt_token')
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null // Don't show error for failed auth check
      })
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
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated
export const selectIsLoading = (state: AuthStore) => state.isLoading
export const selectError = (state: AuthStore) => state.error
export const selectLogin = (state: AuthStore) => state.login
export const selectLogout = (state: AuthStore) => state.logout
