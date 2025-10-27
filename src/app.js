import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import prisma from './prisma.js';

// Simple deterministic pseudo-random for stable mock users per boot
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildUsers(seed = 42) {
  const rand = mulberry32(seed);
  const now = new Date();
  const users = Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    username: `user${i + 1}`,
    display_name: `User ${i + 1}`,
    country: ['FR', 'ES', 'DE', 'IT', 'PT'][Math.floor(rand() * 5)],
    created_at: new Date(now.getTime() - (i + 1) * 86400000).toISOString(),
  }));
  return { users };
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

let USERS = buildUsers(42).users;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'frozenbet-ext-api' });
});

// Reload only synthetic users
app.get('/reload', (req, res) => {
  const seed = Number(req.query.seed ?? 42);
  if (!Number.isFinite(seed)) {
    return res.status(400).json({ error: 'seed must be a number' });
  }
  USERS = buildUsers(seed).users;
  res.json({ ok: true, seed, scope: 'users-only' });
});

// Competitions
app.get('/competitions', async (req, res) => {
  const { status, season } = req.query;
  try {
    const competitions = await prisma.competition.findMany({
      where: {
        ...(status ? { status: String(status) } : {}),
        ...(season ? { season: String(season) } : {}),
      },
      orderBy: { startDate: 'desc' },
    });
    res.json(competitions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch competitions' });
  }
});

app.get('/competitions/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const comp = await prisma.competition.findUnique({ where: { id } });
    if (!comp) return res.status(404).json({ error: 'competition not found' });
    res.json(comp);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch competition' });
  }
});

// Matches
app.get('/matches', async (req, res) => {
  const { competition_id, status, team_id } = req.query;
  const where = {
    ...(competition_id ? { competitionId: Number(competition_id) } : {}),
    ...(status ? { status: String(status) } : {}),
    ...(team_id
      ? { OR: [{ homeTeamId: Number(team_id) }, { awayTeamId: Number(team_id) }] }
      : {}),
  };
  try {
    const matches = await prisma.match.findMany({
      where,
      orderBy: { scheduledDate: 'desc' },
    });
    res.json(matches);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch matches' });
  }
});

app.get('/matches/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const match = await prisma.match.findUnique({ where: { id } });
    if (!match) return res.status(404).json({ error: 'match not found' });
    res.json(match);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch match' });
  }
});

// Users (synthetic only)
app.get('/users', (req, res) => {
  const { country } = req.query;
  let out = USERS;
  if (country) out = out.filter((u) => u.country === country);
  res.json(out);
});

app.get('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const user = USERS.find((u) => u.id === id);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json(user);
});

// Teams
app.get('/teams', async (req, res) => {
  const { competition_id } = req.query;
  try {
    const teams = await prisma.team.findMany({
      where: competition_id ? { competitionId: Number(competition_id) } : {},
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch teams' });
  }
});

app.get('/teams/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: 'team not found' });
    res.json(team);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to fetch team' });
  }
});

export default app;

