import axios from 'axios'

/**
 * Clean, robust API service for Spring Boot backend
 * Backend runs on http://localhost:8000 with context-path: /api
 * All endpoints are prefixed with /api automatically by Spring Boot
 */
const api = axios.create({
  baseURL: 'http://localhost:8000',
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
    const url = config.url || 'unknown'
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${url}`)
    
    if (token) {
      const cleanedToken = token.trim()
      
      // Validate token format and expiration
      if (isValidJWT(cleanedToken)) {
        config.headers['Authorization'] = `Bearer ${cleanedToken}`
        console.log(`🔑 JWT token added to request (${cleanedToken.length} chars)`)
      } else {
        console.warn('⚠️ Invalid JWT token detected, removing...')
        localStorage.removeItem('jwt_token')
        // Don't redirect here, let the response interceptor handle it
      }
    } else {
      console.log('📭 No JWT token available for request')
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor: Handle authentication errors
 */
api.interceptors.response.use(
  (response) => {
    const url = response.config.url || 'unknown'
    console.log(`✅ API Response: ${response.status} ${url}`)
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url || 'unknown'
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN'
    
    console.error(`❌ API Error: ${status} ${method} ${url}`, {
      status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    })
    
    // Handle 401 Unauthorized errors (except for login endpoint)
    if (status === 401 && !url.includes('/api/auth/login')) {
      // Check if this is a validation error vs authentication error
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || ''
      const isValidationError = errorMessage.toLowerCase().includes('validation') || 
                               errorMessage.toLowerCase().includes('required') ||
                               errorMessage.toLowerCase().includes('invalid') ||
                               url.includes('/api/customers') // Customer update validation errors
      
      if (isValidationError) {
        console.warn('⚠️ Validation error (401) - not logging out user')
        // Don't logout for validation errors, let the component handle the error
      } else {
        console.warn('🚫 Authentication failed - token invalid or expired')
        
        if (!isRedirecting) {
          isRedirecting = true
          
          // Clear invalid token
          localStorage.removeItem('jwt_token')
          console.log('🗑️ Cleared invalid JWT token')
          
          // Clear any cached data and redirect to login
          setTimeout(() => {
            console.log('🔄 Redirecting to login...')
            // Clear any cached authentication state
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
    if (parts.length !== 3) {
      console.warn('⚠️ Invalid JWT format: not 3 parts')
      return false
    }
    
    // Decode and check expiration
    const payload = JSON.parse(atob(parts[1]))
    const now = Math.floor(Date.now() / 1000)
    
    if (payload.exp && now > payload.exp) {
      console.warn('⚠️ JWT token expired:', {
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        currentTime: new Date(now * 1000).toISOString()
      })
      return false
    }
    
    console.log('✅ JWT token is valid, expires:', new Date(payload.exp * 1000).toISOString())
    return true
    
  } catch (error) {
    console.error('❌ Error validating JWT token:', error)
    return false
  }
}

// Export the configured axios instance
export default api
