#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Backend2 Integration Test Script${NC}"
echo "This script will test the integration between the frontend and backend2"

# Check if backend2 is running
echo -e "\n${YELLOW}Checking if backend2 is running on port 8081...${NC}"
if curl -s http://localhost:8081/api/health-check > /dev/null; then
  echo -e "${GREEN}✓ Backend2 is running${NC}"
else
  echo -e "${RED}✗ Backend2 is not running on port 8081${NC}"
  echo "Please start backend2 first with: cd backend2 && ./mvnw spring-boot:run"
  exit 1
fi

# Clean up any existing cookies
rm -f cookies.txt

# Test authentication endpoints
echo -e "\n${YELLOW}Testing authentication endpoints...${NC}"

# Test login endpoint
echo "Testing login with admin/admin123..."
LOGIN_RESPONSE=$(curl -v -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "user"; then
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "Response: $LOGIN_RESPONSE"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
fi

# Display cookies for debugging
echo -e "\n${YELLOW}Cookies after login:${NC}"
cat cookies.txt

# Test current user endpoint
echo -e "\n${YELLOW}Testing current user endpoint...${NC}"
USER_RESPONSE=$(curl -v -X GET http://localhost:8081/api/auth/me \
  -b cookies.txt 2>&1)

if echo "$USER_RESPONSE" | grep -q "username"; then
  echo -e "${GREEN}✓ User endpoint successful${NC}"
  echo "Response: $USER_RESPONSE"
else
  echo -e "${RED}✗ User endpoint failed${NC}"
  echo "Response: $USER_RESPONSE"
fi

# Test users endpoint
echo -e "\n${YELLOW}Testing users endpoint...${NC}"
USERS_RESPONSE=$(curl -v -X GET http://localhost:8081/api/users \
  -H "Cookie: $(grep -oP 'JSESSIONID=[^;]+' cookies.txt 2>/dev/null || echo '')" \
  2>&1)

if echo "$USERS_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ Users endpoint successful${NC}"
  echo "Response preview: $(echo $USERS_RESPONSE | cut -c 1-100)..."
else
  echo -e "${RED}✗ Users endpoint failed${NC}"
  echo "Response: $USERS_RESPONSE"
fi

# Test customers endpoint
echo -e "\n${YELLOW}Testing customers endpoint...${NC}"
CUSTOMERS_RESPONSE=$(curl -s -X GET http://localhost:8081/api/customers \
  -b cookies.txt)

if echo "$CUSTOMERS_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ Customers endpoint successful${NC}"
  echo "Response preview: $(echo $CUSTOMERS_RESPONSE | cut -c 1-100)..."
else
  echo -e "${RED}✗ Customers endpoint failed${NC}"
  echo "Response: $CUSTOMERS_RESPONSE"
fi

# Test peer-to-peer endpoints
echo -e "\n${YELLOW}Testing peer-to-peer endpoints...${NC}"

# Test availabilities endpoint
echo "Testing availabilities endpoint..."
AVAIL_RESPONSE=$(curl -s -X GET http://localhost:8081/api/availabilities \
  -b cookies.txt)

if echo "$AVAIL_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ Availabilities endpoint successful${NC}"
  echo "Response preview: $(echo $AVAIL_RESPONSE | cut -c 1-100)..."
else
  echo -e "${RED}✗ Availabilities endpoint failed${NC}"
  echo "Response: $AVAIL_RESPONSE"
fi

# Test bookings endpoint
echo "Testing bookings endpoint..."
BOOKINGS_RESPONSE=$(curl -s -X GET http://localhost:8081/api/bookings \
  -b cookies.txt)

if echo "$BOOKINGS_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ Bookings endpoint successful${NC}"
  echo "Response preview: $(echo $BOOKINGS_RESPONSE | cut -c 1-100)..."
else
  echo -e "${RED}✗ Bookings endpoint failed${NC}"
  echo "Response: $BOOKINGS_RESPONSE"
fi

# Test logout endpoint
echo -e "\n${YELLOW}Testing logout endpoint...${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:8081/api/auth/logout \
  -b cookies.txt)

echo "Logout response: $LOGOUT_RESPONSE"

# Clean up
rm -f cookies.txt

echo -e "\n${GREEN}Integration tests completed!${NC}"
