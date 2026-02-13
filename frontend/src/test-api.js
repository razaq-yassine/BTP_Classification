// Simple script to test API endpoints with JWT token
// Run with: node test-api.js

const token = localStorage.getItem('jwt_token') || 'YOUR_TOKEN_HERE';

async function testEndpoints() {
  console.log('Testing API endpoints with token:', token.substring(0, 15) + '...');

  // Test auth/me endpoint
  try {
    const meResponse = await fetch('http://localhost:8000/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Auth/me status:', meResponse.status);
    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log('Auth/me response:', userData);
    } else {
      console.error('Auth/me failed:', await meResponse.text());
    }
  } catch (error) {
    console.error('Error calling auth/me:', error);
  }

  // Test customers endpoint
  try {
    const customersResponse = await fetch('http://localhost:8000/api/customers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Customers status:', customersResponse.status);
    if (customersResponse.ok) {
      const customersData = await customersResponse.json();
      console.log('Customers response:', customersData);
    } else {
      console.error('Customers failed:', await customersResponse.text());
    }
  } catch (error) {
    console.error('Error calling customers:', error);
  }
}

// Execute tests
testEndpoints();
