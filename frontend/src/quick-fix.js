// Quick fix for JWT authentication issue
// Copy and paste this entire block into your browser console

(async function quickFix() {
  console.log('🚀 Quick fix for JWT authentication...');
  
  // Clear old token
  localStorage.removeItem('jwt_token');
  
  // Get fresh token
  const response = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('jwt_token', data.accessToken);
    console.log('✅ Fresh token stored! Now refresh the page.');
    
    // Auto-refresh the page
    setTimeout(() => {
      console.log('🔄 Refreshing page...');
      window.location.reload();
    }, 1000);
  } else {
    console.error('❌ Failed to get fresh token');
  }
})();
