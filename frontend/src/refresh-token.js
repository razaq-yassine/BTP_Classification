// Simple script to refresh the JWT token
// Run this in browser console to get a fresh token

async function refreshToken() {
  console.log('🔄 Refreshing JWT token...');
  
  try {
    // Clear existing token
    localStorage.removeItem('jwt_token');
    console.log('🗑️ Cleared old token');
    
    // Get fresh token
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
      
      // Store new token
      localStorage.setItem('jwt_token', data.accessToken);
      console.log('✅ Fresh token stored:', data.accessToken.substring(0, 20) + '...');
      
      // Decode and show expiration
      const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
      console.log('📅 Token expires at:', new Date(payload.exp * 1000).toISOString());
      
      // Test the new token
      const testResponse = await fetch('http://localhost:8000/api/customers', {
        headers: {
          'Authorization': `Bearer ${data.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (testResponse.ok) {
        const customers = await testResponse.json();
        console.log('🎉 SUCCESS! Customers endpoint works with fresh token:', customers.count, 'customers found');
        console.log('💡 Now refresh the page or navigate to customers again');
      } else {
        console.error('❌ Fresh token still fails:', testResponse.status);
      }
      
    } else {
      console.error('❌ Failed to get fresh token:', response.status);
    }
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
  }
}

// Auto-run the refresh
refreshToken();

console.log('🔧 Token refresh script loaded. Run refreshToken() to manually refresh.');
