# ReportHub

ReportHub is a responsive civic reporting interface. Residents can submit a
public issue, review their reports, follow progress, and learn how community
reporting works.

## Stack

- React and Vite for the client
- Plain CSS with a small Tailwind-compatible design system
- Node.js and Express for the API
- PostgreSQL via `pg` for production persistence
- HTML, CSS, and JavaScript only in the application code

## Run locally

Install Node.js 20 or newer, then run:

```bash
npm install
npm run dev
```

The optional API can be started with:

```bash
psql "$DATABASE_URL" -f database/schema.sql
DATABASE_URL=postgres://user:password@localhost:5432/reporthub npm run server
```

The API exposes `GET /api/health`, `GET /api/reports`, and `POST /api/reports`.
Reports are inserted into PostgreSQL using the title, category, description,
location, and optional evidence image supplied by the user. The database
generates each reference (`RH-000001`, for example); the client does not
generate placeholder numbers or show success when the insert fails.
