#!/bin/bash

# Start script for running both frontend and Spring Boot backend2
# Author: Cascade
# Date: 2025-08-03

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Generic SaaS Application with Spring Boot Backend${NC}"
echo -e "${BLUE}==================================================${NC}"

# Define the base directory
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$BASE_DIR/frontend"
BACKEND2_DIR="$BASE_DIR/backend2"

# Function to check if a process is running on a port
check_port() {
  lsof -i:$1 > /dev/null 2>&1
  return $?
}

# Start the Spring Boot backend2
start_backend() {
  echo -e "${GREEN}Starting Spring Boot backend2 on port 8080...${NC}"
  cd "$BACKEND2_DIR" || exit
  
  # Check if port 8080 is already in use
  if check_port 8080; then
    echo -e "${RED}Port 8080 is already in use. Please stop the process using this port.${NC}"
    return 1
  fi
  
  # Start Spring Boot application
  ./mvnw spring-boot:run &
  BACKEND_PID=$!
  echo -e "${GREEN}Backend2 started with PID: $BACKEND_PID${NC}"
  echo -e "${GREEN}Backend2 URL: http://localhost:8080${NC}"
  
  # Return to base directory
  cd "$BASE_DIR" || exit
}

# Start the frontend
start_frontend() {
  echo -e "${GREEN}Starting frontend on port 5173...${NC}"
  cd "$FRONTEND_DIR" || exit
  
  # Check if port 5173 is already in use
  if check_port 5173; then
    echo -e "${RED}Port 5173 is already in use. Please stop the process using this port.${NC}"
    return 1
  fi
  
  # Start frontend development server
  npm run dev &
  FRONTEND_PID=$!
  echo -e "${GREEN}Frontend started with PID: $FRONTEND_PID${NC}"
  echo -e "${GREEN}Frontend URL: http://localhost:5173${NC}"
  
  # Return to base directory
  cd "$BASE_DIR" || exit
}

# Function to handle script termination
cleanup() {
  echo -e "${BLUE}Stopping servers...${NC}"
  
  # Kill processes if they exist
  if [ -n "$BACKEND_PID" ]; then
    echo -e "${GREEN}Stopping backend2 (PID: $BACKEND_PID)${NC}"
    kill $BACKEND_PID 2>/dev/null
  fi
  
  if [ -n "$FRONTEND_PID" ]; then
    echo -e "${GREEN}Stopping frontend (PID: $FRONTEND_PID)${NC}"
    kill $FRONTEND_PID 2>/dev/null
  fi
  
  echo -e "${BLUE}All servers stopped.${NC}"
  exit 0
}

# Set up trap to catch SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start servers
start_backend
start_frontend

echo -e "${BLUE}==================================================${NC}"
echo -e "${GREEN}All servers started. Press Ctrl+C to stop all servers.${NC}"

# Keep script running
while true; do
  sleep 1
done
