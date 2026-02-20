import axios from 'axios'

/**
 * Clean, robust API service for Spring Boot backend
 * Backend runs on http://localhost:8000 with context-path: /api
 * All endpoints are prefixed with /api automatically by Spring Boot
 */
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000, // 10 second timeout
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
})

// Prevent multiple simultaneous redirects
let isRedirecting = false

/**
 * Request Interceptor: Add JWT token to all requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token')
    if (token) {
      const cleanedToken = token.trim()
      if (isValidJWT(cleanedToken)) {
        config.headers['Authorization'] = `Bearer ${cleanedToken}`
      } else {
        localStorage.removeItem('jwt_token')
      }
    }
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

function isNetworkError(err: { response?: unknown; code?: string; message?: string }): boolean {
  if (err.response) return false
  const { code, message } = err
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    Boolean(message && (message.includes('Network Error') || message.includes('Failed to fetch')))
  )
}

/**
 * Response Interceptor: Handle authentication errors
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Never clear token or redirect on network errors (backend restart, etc.)
    if (isNetworkError(error)) return Promise.reject(error)

    const status = error.response?.status
    const url = error.config?.url || ''
    // Handle 401 Unauthorized errors (except for login endpoint)
    if (status === 401 && !url.includes('/api/auth/login')) {
      // Check if this is a validation error vs authentication error
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || ''
      const isValidationError = errorMessage.toLowerCase().includes('validation') ||
        errorMessage.toLowerCase().includes('required') ||
        errorMessage.toLowerCase().includes('invalid')

      if (!isValidationError) {
        const path = typeof window !== 'undefined' ? window.location.pathname : ''
        const isAuthPage = ['/login', '/sign-in', '/sign-in-2', '/login-verify-2fa', '/forgot-password', '/change-password-required'].some((p) => path.startsWith(p))
        if (!isAuthPage && !isRedirecting) {
          isRedirecting = true
          localStorage.removeItem('jwt_token')
          setTimeout(() => {
            localStorage.clear()
            sessionStorage.clear()
            window.location.href = '/login'
            isRedirecting = false
          }, 1000)
        }
      }
    }
    
    return Promise.reject(error)
  }
)

/**
 * Utility function to validate JWT token format and expiration
 */
function isValidJWT(token: string): boolean {
  try {
    // Check basic JWT format (3 parts separated by dots)
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // Decode and check expiration
    const payload = JSON.parse(atob(parts[1]))
    const now = Math.floor(Date.now() / 1000)
    
    if (payload.exp && now > payload.exp) return false
    
    return true
    
  } catch {
    return false
  }
}

// Export the configured axios instance
export default api
