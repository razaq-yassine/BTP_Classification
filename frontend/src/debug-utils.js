// Debug utilities for inspecting API errors
// You can run these functions in the browser console

// Function to view all API error logs
window.viewApiErrors = function() {
  const logs = localStorage.getItem('api_error_logs');
  if (logs) {
    const parsedLogs = JSON.parse(logs);
    console.log('📋 API Error Logs:', parsedLogs);
    return parsedLogs;
  } else {
    console.log('📋 No API error logs found');
    return [];
  }
};

// Function to clear API error logs
window.clearApiErrors = function() {
  localStorage.removeItem('api_error_logs');
  console.log('🗑️ API error logs cleared');
};

// Function to decode JWT token payload
window.decodeJWT = function(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
};

// Function to view current JWT token info with expiration
window.viewTokenInfo = function() {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    const decoded = window.decodeJWT(token);
    const now = Math.floor(Date.now() / 1000);
    
    const tokenInfo = {
      exists: true,
      length: token.length,
      hasWhitespace: /\s/.test(token),
      startsWithBearer: token.startsWith('Bearer'),
      prefix: token.substring(0, 20) + '...',
      suffix: '...' + token.substring(token.length - 20),
      decoded: decoded,
      issuedAt: decoded ? new Date(decoded.iat * 1000).toISOString() : 'Unknown',
      expiresAt: decoded ? new Date(decoded.exp * 1000).toISOString() : 'Unknown',
      isExpired: decoded ? now > decoded.exp : 'Unknown',
      timeUntilExpiry: decoded ? (decoded.exp - now) + ' seconds' : 'Unknown'
    };
    
    console.log('🔑 JWT Token Info:', tokenInfo);
    
    if (tokenInfo.isExpired) {
      console.warn('⚠️ TOKEN IS EXPIRED!');
    } else {
      console.log('✅ Token is still valid');
    }
    
    return tokenInfo;
  } else {
    console.log('🔑 No JWT token found');
    return null;
  }
};

// Function to manually test API endpoints
window.testApiEndpoint = async function(endpoint) {
  const token = localStorage.getItem('jwt_token');
  console.log(`🧪 Testing endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(`http://localhost:8000${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log(`✅ Response status: ${response.status}`);
    const data = await response.json();
    console.log('📄 Response data:', data);
    return { status: response.status, data };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
};

// Function to get a fresh token
window.getFreshToken = async function() {
  console.log('🔄 Getting fresh token...');
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Fresh token obtained:', data.accessToken.substring(0, 20) + '...');
      
      // Store the new token
      localStorage.setItem('jwt_token', data.accessToken);
      console.log('💾 Fresh token stored in localStorage');
      
      return data.accessToken;
    } else {
      console.error('❌ Failed to get fresh token:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting fresh token:', error);
    return null;
  }
};

// Function to compare working vs failing endpoints
window.compareEndpoints = async function() {
  console.log('🔍 Comparing /api/auth/me vs /api/customers endpoints...');
  
  const authResult = await window.testApiEndpoint('/api/auth/me');
  console.log('Auth/me result:', authResult);
  
  const customersResult = await window.testApiEndpoint('/api/customers');
  console.log('Customers result:', customersResult);
  
  return { auth: authResult, customers: customersResult };
};

// Function to test with fresh token
window.testWithFreshToken = async function() {
  console.log('🧪 Testing with fresh token...');
  
  // Get fresh token
  const freshToken = await window.getFreshToken();
  if (!freshToken) {
    console.error('❌ Could not get fresh token');
    return;
  }
  
  // Test customers endpoint with fresh token
  const result = await window.testApiEndpoint('/api/customers');
  console.log('📊 Result with fresh token:', result);
  
  return result;
};

console.log('🔧 Debug utilities loaded! Available functions:');
console.log('- viewApiErrors() - View all API error logs');
console.log('- clearApiErrors() - Clear API error logs');
console.log('- viewTokenInfo() - View JWT token information (including expiration)');
console.log('- testApiEndpoint(endpoint) - Test a specific API endpoint');
console.log('- compareEndpoints() - Compare auth/me vs customers endpoints');
console.log('- getFreshToken() - Get a fresh JWT token from backend');
console.log('- testWithFreshToken() - Test customers endpoint with fresh token');
console.log('- decodeJWT(token) - Decode JWT token payload');
