import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Simple deterministic pseudo-random for stable mock data per boot
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Data builders
function buildMockData(seed = 42) {
  const rand = mulberry32(seed);

  const now = new Date();
  const seasons = ['2023/24', '2024/25'];
  const statuses = ['scheduled', 'live', 'finished'];

  const competitions = Array.from({ length: 5 }).map((_, i) => {
    const start = new Date(now);
    start.setDate(now.getDate() - Math.floor(rand() * 30) - 10);
    const end = new Date(start);
    end.setDate(start.getDate() + 90 + Math.floor(rand() * 30));
    return {
      id: i + 1,
      theme_id: Math.floor(rand() * 5) + 1,
      name: `Competition ${i + 1}`,
      description: `Mock competition ${i + 1} for testing`,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      season: seasons[Math.floor(rand() * seasons.length)],
      status: ['upcoming', 'ongoing', 'ended'][Math.floor(rand() * 3)],
      created_at: new Date(start.getTime() - 86400000).toISOString(),
    };
  });

  const teams = [];
  let teamId = 1;
  competitions.forEach((c) => {
    const perComp = 8; // 8 teams per competition
    for (let j = 0; j < perComp; j++) {
      const short = `T${teamId}`;
      teams.push({
        id: teamId,
        competition_id: c.id,
        name: `Team ${teamId}`,
        short_name: short,
        logo_url: `https://example.com/logo/${short}.png`,
        country: ['FR', 'ES', 'DE', 'IT', 'PT'][Math.floor(rand() * 5)],
        external_api_id: `ext-${teamId}`,
        created_at: new Date().toISOString(),
      });
      teamId++;
    }
  });

  const matches = [];
  let matchId = 1;
  competitions.forEach((c) => {
    const compTeams = teams.filter((t) => t.competition_id === c.id);
    const pairings = 16; // arbitrary number of fixtures
    for (let k = 0; k < pairings; k++) {
      const home = compTeams[Math.floor(rand() * compTeams.length)];
      let away = compTeams[Math.floor(rand() * compTeams.length)];
      if (away.id === home.id) {
        away = compTeams[(compTeams.indexOf(home) + 1) % compTeams.length];
      }
      const daysOffset = Math.floor(rand() * 60) - 30; // past/future window
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() + daysOffset);
      const status = statuses[Math.floor(rand() * statuses.length)];
      const isFinished = status === 'finished';
      const home_score = isFinished ? Math.floor(rand() * 5) : null;
      const away_score = isFinished ? Math.floor(rand() * 5) : null;

      matches.push({
        id: matchId++,
        competition_id: c.id,
        home_team_id: home.id,
        away_team_id: away.id,
        scheduled_date: scheduled.toISOString(),
        status,
        home_score,
        away_score,
        location: ['Stadium A', 'Stadium B', 'Stadium C'][Math.floor(rand() * 3)],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  });

  // Users are not in your DB schema, but you asked for a GET users
  // endpoint; we simulate lightweight bettor profiles that your backend
  // may join with bets elsewhere.
  const users = Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    username: `user${i + 1}`,
    display_name: `User ${i + 1}`,
    country: ['FR', 'ES', 'DE', 'IT', 'PT'][Math.floor(rand() * 5)],
    created_at: new Date(now.getTime() - (i + 1) * 86400000).toISOString(),
  }));

  return { competitions, teams, matches, users };
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Seeded mock data; change seed via ?seed= query on /reload if desired
let DATA = buildMockData(42);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'frozenbet-ext-api' });
});

// Optional: hot reload mock data with a seed (GET-only)
app.get('/reload', (req, res) => {
  const seed = Number(req.query.seed ?? 42);
  if (!Number.isFinite(seed)) {
    return res.status(400).json({ error: 'seed must be a number' });
  }
  DATA = buildMockData(seed);
  res.json({ ok: true, seed });
});

// Competitions
app.get('/competitions', (req, res) => {
  const { status, season } = req.query;
  let out = DATA.competitions;
  if (status) out = out.filter((c) => c.status === status);
  if (season) out = out.filter((c) => c.season === season);
  res.json(out);
});

app.get('/competitions/:id', (req, res) => {
  const id = Number(req.params.id);
  const comp = DATA.competitions.find((c) => c.id === id);
  if (!comp) return res.status(404).json({ error: 'competition not found' });
  res.json(comp);
});

// Matches
app.get('/matches', (req, res) => {
  const { competition_id, status, team_id } = req.query;
  let out = DATA.matches;
  if (competition_id) out = out.filter((m) => m.competition_id === Number(competition_id));
  if (status) out = out.filter((m) => m.status === status);
  if (team_id) out = out.filter((m) => m.home_team_id === Number(team_id) || m.away_team_id === Number(team_id));
  res.json(out);
});

app.get('/matches/:id', (req, res) => {
  const id = Number(req.params.id);
  const match = DATA.matches.find((m) => m.id === id);
  if (!match) return res.status(404).json({ error: 'match not found' });
  res.json(match);
});

// Users (simulated)
app.get('/users', (req, res) => {
  const { country } = req.query;
  let out = DATA.users;
  if (country) out = out.filter((u) => u.country === country);
  res.json(out);
});

app.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = DATA.users.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json(user);
});

// For convenience: teams listing (useful for joining match/team names)
app.get('/teams', (req, res) => {
  const { competition_id } = req.query;
  let out = DATA.teams;
  if (competition_id) out = out.filter((t) => t.competition_id === Number(competition_id));
  res.json(out);
});

app.get('/teams/:id', (req, res) => {
  const id = Number(req.params.id);
  const team = DATA.teams.find((t) => t.id === id);
  if (!team) return res.status(404).json({ error: 'team not found' });
  res.json(team);
});

// Start server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`FrozenBet external mock API listening on :${PORT}`);
});

