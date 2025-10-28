import 'dotenv/config';
import app from './app.js';

// Local dev server only; Vercel uses api/index.js
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`FrozenBet external API listening on :${PORT}`);
});
