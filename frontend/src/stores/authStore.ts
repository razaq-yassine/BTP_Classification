import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import axios from 'axios'

// Configure axios for Django backend
axios.defaults.baseURL = 'http://localhost:8000/api'
axios.defaults.withCredentials = true

interface AuthUser {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  date_joined: string
}

interface AuthState {
  auth: {
    user: AuthUser | null
    isAuthenticated: boolean
    isLoading: boolean
    setUser: (user: AuthUser | null) => void
    setLoading: (loading: boolean) => void
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => Promise<void>
    checkAuth: () => Promise<void>
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()(subscribeWithSelector((set) => ({
  auth: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    setUser: (user) =>
      set((state) => ({ 
        ...state, 
        auth: { 
          ...state.auth, 
          user, 
          isAuthenticated: !!user 
        } 
      })),
    setLoading: (isLoading) =>
      set((state) => ({ 
        ...state, 
        auth: { ...state.auth, isLoading } 
      })),
    login: async (username: string, password: string) => {
      try {
        console.log('🔐 Starting login attempt...', { username })
        set((state) => ({ 
          ...state, 
          auth: { ...state.auth, isLoading: true } 
        }))
        
        console.log('📡 Making POST request to /auth/login/')
        const response = await axios.post('/auth/login/', {
          username,
          password
        })
        
        console.log('✅ Login response received:', response.data)
        const user = response.data.user
        set((state) => ({ 
          ...state, 
          auth: { 
            ...state.auth, 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          } 
        }))
        
        console.log('🎉 Login successful, user authenticated:', user)
        return { success: true }
      } catch (error: any) {
        console.error('❌ Login failed:', error)
        console.error('Response data:', error.response?.data)
        console.error('Response status:', error.response?.status)
        console.error('Response headers:', error.response?.headers)
        
        set((state) => ({ 
          ...state, 
          auth: { 
            ...state.auth, 
            isLoading: false 
          } 
        }))
        
        const errorMessage = error.response?.data?.non_field_errors?.[0] || 
                           error.response?.data?.detail || 
                           error.response?.data?.username?.[0] ||
                           error.response?.data?.password?.[0] ||
                           error.message ||
                           'Login failed'
        console.error('Error message to display:', errorMessage)
        return { success: false, error: errorMessage }
      }
    },
    logout: async () => {
      try {
        await axios.post('/auth/logout/')
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        set((state) => ({ 
          ...state, 
          auth: { 
            ...state.auth, 
            user: null, 
            isAuthenticated: false 
          } 
        }))
      }
    },
    checkAuth: async () => {
      try {
        const response = await axios.get('/auth/user/')
        const user = response.data
        console.log('✅ User authenticated:', user)
        set((state) => ({ 
          ...state, 
          auth: { 
            ...state.auth, 
            user, 
            isAuthenticated: true 
          } 
        }))
      } catch (error: any) {
        // Don't log 403 errors as they're expected when not authenticated
        if (error.response?.status !== 403) {
          console.error('❌ Auth check failed:', error)
        }
        set((state) => ({ 
          ...state, 
          auth: { 
            ...state.auth, 
            user: null, 
            isAuthenticated: false 
          } 
        }))
      }
    },
    reset: () =>
      set((state) => ({
        ...state,
        auth: { 
          ...state.auth, 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        }
      }))
  }
})))

// Stable selectors to prevent infinite loops
export const selectAuth = (state: any) => state.auth
export const selectUser = (state: any) => state.auth.user
export const selectIsAuthenticated = (state: any) => state.auth.isAuthenticated
export const selectIsLoading = (state: any) => state.auth.isLoading
export const selectLogin = (state: any) => state.auth.login
export const selectLogout = (state: any) => state.auth.logout

// Helper hook with shallow comparison to prevent unnecessary re-renders
export const useAuth = () => useAuthStore(selectAuth)
