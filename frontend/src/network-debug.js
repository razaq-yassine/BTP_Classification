// Network debugging utilities to compare frontend vs curl requests
console.log('🔧 Network Debug Utilities Loaded!')

// Function to capture and log actual request headers
window.debugNetworkRequest = function() {
  const token = localStorage.getItem('jwt_token')
  console.log('🔍 Current JWT Token:', token ? token.substring(0, 20) + '...' : 'null')
  console.log('🔍 Token Length:', token ? token.length : 0)
  
  if (token) {
    // Test the exact same request that curl makes
    fetch('/api/customers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('✅ Direct fetch response status:', response.status)
      console.log('✅ Direct fetch response headers:', [...response.headers.entries()])
      return response.text()
    })
    .then(data => {
      console.log('✅ Direct fetch response data:', data.substring(0, 200))
    })
    .catch(error => {
      console.error('❌ Direct fetch error:', error)
    })
  }
}

// Function to compare token with curl
window.compareCurlToken = function() {
  const frontendToken = localStorage.getItem('jwt_token')
  console.log('🔍 Frontend token (first 50 chars):', frontendToken ? frontendToken.substring(0, 50) : 'null')
  console.log('🔍 Frontend token length:', frontendToken ? frontendToken.length : 0)
  
  // Get fresh token from backend like curl does
  fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  })
  .then(response => response.json())
  .then(data => {
    const curlToken = data.accessToken
    console.log('🔍 Curl-style token (first 50 chars):', curlToken ? curlToken.substring(0, 50) : 'null')
    console.log('🔍 Curl-style token length:', curlToken ? curlToken.length : 0)
    console.log('🔍 Tokens match:', frontendToken === curlToken)
    
    // Test curl-style token with direct fetch
    return fetch('/api/customers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${curlToken}`,
        'Content-Type': 'application/json'
      }
    })
  })
  .then(response => {
    console.log('✅ Curl-style token test status:', response.status)
    return response.text()
  })
  .then(data => {
    console.log('✅ Curl-style token test data:', data.substring(0, 200))
  })
  .catch(error => {
    console.error('❌ Curl-style token test error:', error)
  })
}

// Function to inspect axios interceptor behavior
window.debugAxiosInterceptor = function() {
  const token = localStorage.getItem('jwt_token')
  console.log('🔍 Testing axios interceptor with token:', token ? token.substring(0, 20) + '...' : 'null')
  
  // Import and use the api instance
  import('/src/services/api.ts').then(apiModule => {
    const api = apiModule.default
    
    console.log('🔍 Making request through axios interceptor...')
    api.get('/api/customers')
      .then(response => {
        console.log('✅ Axios interceptor success:', response.status, response.data)
      })
      .catch(error => {
        console.error('❌ Axios interceptor error:', error.response?.status, error.response?.data)
        console.error('❌ Error config:', error.config)
        console.error('❌ Request headers:', error.config?.headers)
      })
  })
}

console.log('🔧 Available debug functions:')
console.log('- debugNetworkRequest() - Test direct fetch with current token')
console.log('- compareCurlToken() - Compare frontend token with fresh curl-style token')
console.log('- debugAxiosInterceptor() - Debug axios interceptor behavior')
