FrozenBet External Mock API

Description
- Express server providing competitions, matches, and teams. Data now persists in SQLite via Prisma. Users remain synthetic (not persisted). Only GET endpoints are exposed to keep integration simple for backend-to-backend calls.

Install
- Requires Node.js 18+
- Run: `npm install`
- Set `DATABASE_URL` in Vercel Project Settings. If using Vercel Postgres, copy `POSTGRES_PRISMA_URL` into `DATABASE_URL`.
- Generate Prisma client locally: `npm run prisma:generate`
- Create DB schema locally against your Vercel Postgres URL: `npm run prisma:migrate` (or `npm run prisma:push` for dev)
- Seed NHL data locally: `npm run db:seed`

Run
- Start: `npm start`
- Dev (watch): `npm run dev`
- Default port: `4001` (override with env `PORT`)

Endpoints (GET)
- `GET /health` → Service status
- `GET /reload?seed=42` → Re-generate deterministic mock data with a seed
- `GET /competitions` → List competitions; filters: `status`, `season`
- `GET /competitions/:id` → Competition by id
- `GET /matches` → List matches; filters: `competition_id`, `status`, `team_id`
- `GET /matches/:id` → Match by id
- `GET /users` → Simulated users; filter: `country`
- `GET /users/:id` → User by id
- `GET /teams` → Teams; filter: `competition_id`
- `GET /teams/:id` → Team by id

Notes
- Deployment target is Vercel Serverless Functions. The Express app is exported via `api/index.js`. Routes are accessible under `/api/...` (e.g. `/api/competitions`).
- Use Vercel Postgres or any managed Postgres. On Vercel, set `DATABASE_URL` to the pooled Prisma URL.
- `/reload?seed=...` only affects synthetic users (not DB data).
- The shape of returned objects follows the Prisma schema; users are synthetic to satisfy the requested `GET /users` integration.

Deploy (Vercel)
- Connect the repo to Vercel.
- In Project → Settings → Environment Variables, add `DATABASE_URL` with your Postgres Prisma URL.
- Deploy. Endpoints: `/api/health`, `/api/competitions`, `/api/matches`, `/api/teams`, `/api/users`.

Examples
- `GET http://localhost:4001/competitions`
- `GET http://localhost:4001/matches?competition_id=1&status=finished`
- `GET http://localhost:4001/users?country=FR`
