#!/bin/bash

echo "Starting backend server..."
cd backend
python3 manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!

echo "Backend started with PID: $BACKEND_PID"

echo "Starting frontend server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Frontend started with PID: $FRONTEND_PID"

echo "Both servers are starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"

# Keep the script running
wait
