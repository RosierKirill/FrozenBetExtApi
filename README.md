FrozenBet External Mock API

Description
- Express server providing competitions, matches, and teams. Data now persists in SQLite via Prisma. Users remain synthetic (not persisted). Only GET endpoints are exposed to keep integration simple for backend-to-backend calls.

Install
- Requires Node.js 18+
- Run: `npm install`
- Generate Prisma client: `npm run prisma:generate`
- Create DB schema: `npm run prisma:push`
- Seed NHL data: `npm run db:seed`

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
- Competitions, teams, and matches are stored in `prisma/dev.db` (SQLite) and seeded with real NHL teams and sample fixtures.
- `/reload?seed=...` now only affects synthetic users (not DB data).
- The shape of returned objects follows the Prisma schema; users are synthetic to satisfy the requested `GET /users` integration.

Examples
- `GET http://localhost:4001/competitions`
- `GET http://localhost:4001/matches?competition_id=1&status=finished`
- `GET http://localhost:4001/users?country=FR`
