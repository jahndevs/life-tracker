# Life Tracker

A self-hosted daily tracker for race training, nutrition, journaling, habits and reading.

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 7 + SQLite · Recharts · Vitest

## Getting started

```bash
npm install            # also runs `prisma generate`
cp .env.example .env
npm run db:migrate     # creates prisma/dev.db
npm run db:seed        # optional demo account: demo@lifetracker.local / demo-password
npm run dev
```

Open http://localhost:3000 and sign up. Onboarding asks for your race date and weights. Then add
macro targets, supplements and your training week on the Plan page.

## Features

| Route | What it does |
| --- | --- |
| `/` | **Today.** Day score, streak, this week's target weight and current phase. Checklists for nutrition, supplements and training, plus the day's habits, a mood check-in and current reading. `?date=` opens past days. |
| `/week` | 7-day grid of every checklist with a weekly % per row. Every cell toggles. |
| `/weigh-ins` | Weight and measurements, charted against the weekly target line. |
| `/journal` | One entry per day with mood and tags. Calendar, search and tag filters. |
| `/habits` | Daily, weekday or custom-day habits with streaks, 30-day % and a consistency heatmap. |
| `/books` | Reading, Up next and Finished shelves with page progress, ratings and yearly stats. |
| `/plan` | Phase timeline, race and weight goals, macro targets per phase, supplements and the weekly training template. |

## How it works

- **Phases** (Base/Cut → Volume → Race-Specific → Taper) are derived from the plan numbers in
  `src/lib/phases.ts`: the cut runs until goal weight, the taper is the last 2 weeks and race-specific
  work is the 8 weeks before it.
- **Days** (`DayLog`) are created from the plan the first time they're opened, so editing the plan
  never rewrites history. Days never opened score zero.
- **Streaks and scores** live in `src/lib/adherence.ts` and are reused by habits and the journal.
  Habit streaks only count scheduled days.
- **Dates** are stored as `YYYY-MM-DD` strings in the user's timezone.
- **Auth** uses database sessions: the httpOnly cookie holds a random token and the database stores
  its SHA-256. Passwords are hashed with bcrypt. Every server action re-checks the session and scopes
  its queries by user.

## Scripts

`dev` · `build` · `start` · `lint` · `typecheck` · `test` · `db:migrate` · `db:seed` · `db:studio`
