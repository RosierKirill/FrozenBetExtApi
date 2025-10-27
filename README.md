FrozenBet External Mock API

Description
- Express server that simulates competitions, matches, and users for a sports betting backend. Only GET endpoints are exposed to keep integration simple for backend-to-backend calls.

Install
- Requires Node.js 18+
- Run: `npm install`

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
- Data is generated in-memory at startup using a deterministic PRNG for stable results. Use `/reload?seed=...` to change the seed without restarting.
- The shape of returned objects follows your DB schema for competitions, teams, and matches; users are synthetic to satisfy the requested `GET /users` integration.

Examples
- `GET http://localhost:4001/competitions`
- `GET http://localhost:4001/matches?competition_id=1&status=finished`
- `GET http://localhost:4001/users?country=FR`

