import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NHL_TEAMS = [
  { name: 'Anaheim Ducks', short: 'ANA', country: 'USA' },
  { name: 'Arizona Coyotes', short: 'ARI', country: 'USA' },
  { name: 'Boston Bruins', short: 'BOS', country: 'USA' },
  { name: 'Buffalo Sabres', short: 'BUF', country: 'USA' },
  { name: 'Calgary Flames', short: 'CGY', country: 'CAN' },
  { name: 'Carolina Hurricanes', short: 'CAR', country: 'USA' },
  { name: 'Chicago Blackhawks', short: 'CHI', country: 'USA' },
  { name: 'Colorado Avalanche', short: 'COL', country: 'USA' },
  { name: 'Columbus Blue Jackets', short: 'CBJ', country: 'USA' },
  { name: 'Dallas Stars', short: 'DAL', country: 'USA' },
  { name: 'Detroit Red Wings', short: 'DET', country: 'USA' },
  { name: 'Edmonton Oilers', short: 'EDM', country: 'CAN' },
  { name: 'Florida Panthers', short: 'FLA', country: 'USA' },
  { name: 'Los Angeles Kings', short: 'LAK', country: 'USA' },
  { name: 'Minnesota Wild', short: 'MIN', country: 'USA' },
  { name: 'Montréal Canadiens', short: 'MTL', country: 'CAN' },
  { name: 'Nashville Predators', short: 'NSH', country: 'USA' },
  { name: 'New Jersey Devils', short: 'NJD', country: 'USA' },
  { name: 'New York Islanders', short: 'NYI', country: 'USA' },
  { name: 'New York Rangers', short: 'NYR', country: 'USA' },
  { name: 'Ottawa Senators', short: 'OTT', country: 'CAN' },
  { name: 'Philadelphia Flyers', short: 'PHI', country: 'USA' },
  { name: 'Pittsburgh Penguins', short: 'PIT', country: 'USA' },
  { name: 'San Jose Sharks', short: 'SJS', country: 'USA' },
  { name: 'Seattle Kraken', short: 'SEA', country: 'USA' },
  { name: 'St. Louis Blues', short: 'STL', country: 'USA' },
  { name: 'Tampa Bay Lightning', short: 'TBL', country: 'USA' },
  { name: 'Toronto Maple Leafs', short: 'TOR', country: 'CAN' },
  { name: 'Vancouver Canucks', short: 'VAN', country: 'CAN' },
  { name: 'Vegas Golden Knights', short: 'VGK', country: 'USA' },
  { name: 'Washington Capitals', short: 'WSH', country: 'USA' },
  { name: 'Winnipeg Jets', short: 'WPG', country: 'CAN' },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Seeding database with NHL data...');

  // Ensure schema exists only for SQLite dev fallback. For Postgres, use prisma migrate/push.
  const url = process.env.DATABASE_URL || '';
  const isSQLite = url.startsWith('file:') || url.includes('sqlite');
  if (isSQLite) {
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Competition" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        themeId INTEGER,
        name TEXT NOT NULL,
        description TEXT,
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        season TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Team" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competitionId INTEGER,
        name TEXT NOT NULL,
        shortName TEXT,
        logoUrl TEXT,
        country TEXT,
        externalApiId TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT Team_competitionId_fkey FOREIGN KEY (competitionId) REFERENCES Competition(id) ON DELETE SET NULL ON UPDATE CASCADE
      );`
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "Match" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competitionId INTEGER NOT NULL,
        homeTeamId INTEGER NOT NULL,
        awayTeamId INTEGER NOT NULL,
        scheduledDate DATETIME NOT NULL,
        status TEXT NOT NULL,
        homeScore INTEGER,
        awayScore INTEGER,
        location TEXT,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT Match_competitionId_fkey FOREIGN KEY (competitionId) REFERENCES Competition(id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT Match_homeTeamId_fkey FOREIGN KEY (homeTeamId) REFERENCES Team(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT Match_awayTeamId_fkey FOREIGN KEY (awayTeamId) REFERENCES Team(id) ON DELETE RESTRICT ON UPDATE CASCADE
      );`
    );
  }

  // Clean existing data to keep seed idempotent in dev
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.competition.deleteMany();

  const season = '2024/25';
  const startDate = new Date('2024-10-01T00:00:00Z');
  const endDate = new Date('2025-04-20T00:00:00Z');

  const competition = await prisma.competition.create({
    data: {
      name: 'NHL Regular Season',
      description: 'National Hockey League Regular Season',
      themeId: 1,
      startDate,
      endDate,
      season,
      status: 'ongoing',
    },
  });

  // Insert teams
  const teamRecords = await prisma.$transaction(
    NHL_TEAMS.map((t, idx) =>
      prisma.team.create({
        data: {
          competitionId: competition.id,
          name: t.name,
          shortName: t.short,
          logoUrl: `https://static.example.com/logos/${t.short}.png`,
          country: t.country,
          externalApiId: `nhl-${t.short}`,
        },
      }),
    ),
  );

  // Build some fixtures: 40 sample games across the season window
  const matchesToCreate = [];
  const statuses = ['scheduled', 'live', 'finished'];
  for (let i = 0; i < 40; i++) {
    const homeIdx = randomInt(0, teamRecords.length - 1);
    let awayIdx = randomInt(0, teamRecords.length - 1);
    if (awayIdx === homeIdx) awayIdx = (homeIdx + 1) % teamRecords.length;

    const homeTeam = teamRecords[homeIdx];
    const awayTeam = teamRecords[awayIdx];

    // Date spread across -15 to +60 days from today
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + randomInt(-15, 60));

    const status = statuses[randomInt(0, statuses.length - 1)];
    const finished = status === 'finished';
    const live = status === 'live';

    matchesToCreate.push(
      prisma.match.create({
        data: {
          competitionId: competition.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          scheduledDate,
          status,
          homeScore: finished || live ? randomInt(0, 6) : null,
          awayScore: finished || live ? randomInt(0, 6) : null,
          location: `${homeTeam.shortName} Arena`,
        },
      }),
    );
  }

  await prisma.$transaction(matchesToCreate);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
