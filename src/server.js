import 'dotenv/config';
import app from './app.js';

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

// Data builders (users only; domain data now in DB)
function buildUsers(seed = 42) {
  const rand = mulberry32(seed);

  const now = new Date();
  // Users are synthetic (not stored in DB)
  const users = Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    username: `user${i + 1}`,
    display_name: `User ${i + 1}`,
    country: ['FR', 'ES', 'DE', 'IT', 'PT'][Math.floor(rand() * 5)],
    created_at: new Date(now.getTime() - (i + 1) * 86400000).toISOString(),
  }));

  return { users };
}


app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Local dev server only; Vercel uses api/index.js


// Start server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`FrozenBet external mock API listening on :${PORT}`);
});
