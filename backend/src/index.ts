import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth.js'
import { entityRoutes } from './routes/entities.js'
import { runMigrations } from './db/migrate.js'
import { initDb } from './db/init.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

await runMigrations()
await initDb()

app.route('/api/auth', authRoutes)
app.route('/api', entityRoutes)

import { serve } from '@hono/node-server'

const port = Number(process.env.PORT) || 8000
console.log(`Server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
