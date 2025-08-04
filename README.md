# Generic SaaS Application

A full-stack SaaS application with React frontend (based on shadcn-admin) and Django backend.

## Project Structure

```
generic_saas/
├── frontend/          # React + TypeScript frontend (Vite)
├── backend/           # Django REST API backend
├── .devrules          # Development rules and guidelines
└── README.md          # This file
```

## Features

- **Authentication**: Django session-based authentication (Clerk removed)
- **Frontend**: React with TanStack Router, Zustand state management, shadcn/ui components
- **Backend**: Django REST Framework with SQLite database
- **Pre-populated Data**: Default users and sample customers
- **Dashboard**: Customer data display in JSON format

## Quick Start

### Backend (Django)

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run migrations and populate data:
   ```bash
   python manage.py migrate
   python manage.py populate_data
   ```

4. Start Django development server:
   ```bash
   python manage.py runserver 8000
   ```

The backend will be available at `http://localhost:8000`

### Frontend (React)

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start development server:
   ```bash
   pnpm run dev
   ```

The frontend will be available at `http://localhost:5173`

## Default Login Credentials

The application comes with pre-populated user accounts:

- **Admin User**: 
  - Username: `admin`
  - Password: `admin123`

- **Demo User**: 
  - Username: `demo` 
  - Password: `demo123`

## API Endpoints

- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/user/` - Get current user info
- `GET /api/customers/` - Get customers list (requires authentication)

## Application Flow

1. **Landing Page**: Redirects to login if not authenticated, dashboard if authenticated
2. **Login Page**: Pre-populated with default credentials for easy testing
3. **Dashboard**: Displays customer data in JSON format with a simple table view

## Development Notes

- Backend uses SQLite for simplicity (easy to configure)
- Frontend uses session-based authentication with Django
- CORS is configured for localhost development
- Customer data is displayed in JSON format as requested
- Authentication state is managed with Zustand

## Technologies Used

### Frontend
- React 19 + TypeScript
- TanStack Router for routing
- Zustand for state management
- shadcn/ui for UI components
- Tailwind CSS for styling
- Axios for API calls

### Backend
- Django 4.2.7
- Django REST Framework
- django-cors-headers
- SQLite database

## Database Schema

### User Model (Custom)
- username, email, first_name, last_name
- is_active, date_joined
- Extends Django's AbstractUser

### Customer Model
- first_name, last_name, email, phone
- company, address
- created_at, updated_at, is_active

## Troubleshooting

### Route Tree Issues
If you encounter TypeScript errors related to routes, the TanStack Router route tree may need regeneration:

1. Stop the frontend dev server
2. Delete `src/routeTree.gen.ts` if it exists
3. Restart the dev server with `pnpm run dev`

### CORS Issues
Ensure both servers are running on the correct ports:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Future Enhancements

- Add customer CRUD operations
- Implement role-based permissions
- Add data validation and error handling
- Implement pagination for customer list
- Add search and filtering capabilities
