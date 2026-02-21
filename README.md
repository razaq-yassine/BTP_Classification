# Generic SaaS Application

A full-stack SaaS application with React frontend (based on shadcn-admin) and Hono backend.

## Project Structure

```
generic_saas/
├── frontend/          # React + TypeScript frontend (Vite)
├── backend/           # Hono REST API backend (Node.js)
│   └── triggers/      # Object triggers (beforeInsert, afterUpdate, etc.)
├── metadata/          # Object metadata (symlink to frontend/public/metadata)
├── .devrules          # Development rules and guidelines
└── README.md          # This file
```

## Features

- **Authentication**: JWT-based authentication
- **Frontend**: React with TanStack Router, Zustand state management, shadcn/ui components
- **Backend**: Hono + Drizzle ORM with MySQL database
- **Pre-populated Data**: Admin user on first run (minimal seed)
- **Triggers**: Extensible before/after hooks for entity operations

## Quick Start

**Building with an AI agent?** Have the agent read `docs/USAGE.md` and `docs/AGENT_BUILD_GUIDE.md` first. The agent must answer planning questions (multi-tenancy, naming, data models, profiles, list views, dashboard, translations) before implementing.

### Backend (Hono)

1. Navigate to backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server (auto-seeds admin on first run):
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
- Entity CRUD: `GET/POST/PUT/DELETE /api/{objectName}` — generated from metadata. See `docs/USAGE.md` for adding objects.

## Application Flow

1. **Landing Page**: Redirects to login if not authenticated
2. **Login Page**: JWT login with admin/admin123
3. **Dashboard**: Metadata-driven list/detail views for configured objects

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

To add a new object: create metadata folder in `frontend/public/metadata/objects/{name}/`, run `db:deploy`. See `docs/USAGE.md`.

## Development Notes

- Backend uses MySQL (mysql2). Set `DATABASE_URL` in `.env` (e.g. `mysql://root:root@localhost:3306/generic_saas`). Create the database before first run.
- JWT tokens stored in localStorage
- CORS configured for localhost:5173 and 5174
- Triggers in `backend/triggers/` run before/after insert/update/delete

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
- mysql2
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

- Role-based permissions (profiles) — see `docs/USAGE.md`
- Data validation and error handling
