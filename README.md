# SnuggleState Hush

Your personal sleep sanctuary. A premium sleep tracker built as part of the SnuggleState Life OS suite.

## Tech Stack

- **Frontend:** React 18 + Vite (JavaScript, no TypeScript)
- **Database:** Neon PostgreSQL (serverless, via `pg` pool)
- **Backend:** Vercel Serverless Functions (`/api` folder)
- **Auth:** JWT (30-day expiry) + bcrypt password hashing
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`) for personalised sleep insights
- **Styling:** Plain CSS with Google Fonts (Playfair Display + Inter)

## Features

- Email + password authentication with protected routes
- Sleep log with manual entry + Apple Health CSV import
- Morning check-ins (rest feeling, mood, notes)
- Lifestyle factor tracking (caffeine, alcohol, stress, exercise)
- AI-powered sleep insights via Claude
- Streak tracking with heatmap calendar
- SVG bar charts (no external chart library)
- Mobile responsive — sidebar on desktop, bottom nav on mobile

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

The `.env` file is already configured. For production Vercel deployment, add these in the Vercel dashboard under **Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI insights |

### 3. Run the database schema

In the [Neon Console](https://console.neon.tech), open the SQL Editor for your database and run the contents of `schema.sql`.

Or via `psql`:
```bash
psql "$DATABASE_URL" -f schema.sql
```

### 4. Local development

The easiest way to run locally with both the Vite dev server and Vercel serverless functions:

```bash
npx vercel dev
```

This starts everything on `http://localhost:3000`.

Alternatively, for frontend-only dev (API calls will fail without serverless):
```bash
npm run dev
```

### 5. Deploy to Vercel

```bash
npx vercel --prod
```

Or connect the GitHub repository to Vercel for automatic deployments on push.

## Apple Health CSV Import

Export your health data from iPhone:
1. Health app → your profile → Export All Health Data
2. Unzip the archive
3. Find `apple_health_export/export.csv` (or individual CSV files)
4. Upload via the **Sleep Log → Import from Apple Health** button

The parser handles:
- Apple Health detailed format with sleep stage columns (`type`, `startDate`, `endDate`)
- Sleep stages: REM, Deep, Core, Awake
- Grouping by sleep night (rows spanning midnight are grouped by sleep-session date)
- Deduplication by date on re-upload (upsert behaviour)

## Project Structure

```
snugglestate-hush/
├── api/                    # Vercel Serverless Functions
│   ├── _db.js             # Neon PostgreSQL pool singleton
│   ├── _auth.js           # JWT helpers
│   ├── auth/              # login, signup, me
│   ├── sleep/             # CRUD + CSV import
│   ├── checkins/          # Morning check-in CRUD
│   ├── factors/           # Factor log CRUD
│   ├── insights/          # AI insight generation
│   └── users/             # Profile, password, goals, account
├── src/
│   ├── components/        # Layout, WeekCalendar, SleepChart, etc.
│   ├── context/           # AuthContext
│   ├── pages/             # All 8 app pages
│   └── utils/             # api.js, dateUtils.js, sleepUtils.js
├── schema.sql             # PostgreSQL schema
├── vercel.json            # Vercel routing config
└── .env                   # Local environment variables (not committed)
```
