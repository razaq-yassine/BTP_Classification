# Generic SaaS Application

A full-stack SaaS application with React frontend (based on shadcn-admin) and Hono backend.

## Project Structure

```
generic_saas/
├── frontend/          # React + TypeScript frontend (Vite)
├── backend/           # Hono REST API backend (Node.js)
├── triggers/          # Object triggers (beforeInsert, afterUpdate, etc.)
├── metadata/          # Object metadata (symlink to frontend/public/metadata)
├── .devrules          # Development rules and guidelines
└── README.md          # This file
```

## Features

- **Authentication**: JWT-based authentication
- **Frontend**: React with TanStack Router, Zustand state management, shadcn/ui components
- **Backend**: Hono + Drizzle ORM with SQLite database
- **Pre-populated Data**: Admin user and sample customers/orders
- **Triggers**: Extensible before/after hooks for entity operations

## Quick Start

### Backend (Hono)

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server (auto-seeds admin + sample data on first run):
   ```bash
   pnpm run dev
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

- **Admin User**: 
  - Username: `admin`
  - Password: `admin123`

## API Endpoints

- `POST /api/auth/login` - User login (returns JWT)
- `GET /api/auth/me` - Get current user (requires Bearer token)
- `GET /api/customers` - List customers (paginated)
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Soft delete customer
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/customer/:customerId` - List orders for a customer
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Soft delete order

## Application Flow

1. **Landing Page**: Redirects to login if not authenticated
2. **Login Page**: JWT login with admin/admin123
3. **Dashboard**: Customer and order management with list/detail views

## Database (Metadata-Driven + Migrations)

The schema is generated from metadata. Workflow:

1. **Edit metadata** in `metadata/objects/{name}/` (fields, types, etc.)
2. **Generate schema** from metadata:
   ```bash
   cd backend && pnpm run db:generate-from-metadata
   ```
3. **Generate migration** from schema:
   ```bash
   pnpm run db:generate
   ```
4. **Apply migrations** (runs automatically on `pnpm run dev`)

To add a new object: create metadata folder, run `db:generate-from-metadata`, add entity routes in `entities.ts`, then `db:generate`.

## Development Notes

- Backend uses SQLite (better-sqlite3) for simplicity
- JWT tokens stored in localStorage
- CORS configured for localhost:5173 and 5174
- Triggers in `triggers/` run before/after insert/update/delete

## Technologies Used

### Frontend
- React 19 + TypeScript
- TanStack Router for routing
- Zustand for state management
- shadcn/ui for UI components
- Tailwind CSS for styling
- Axios for API calls

### Backend
- Hono (Node.js)
- Drizzle ORM
- better-sqlite3
- jose (JWT)
- bcrypt

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
