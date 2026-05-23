# CampusLib Admin

> A lightweight admin dashboard for campus library management — built with React 19, TypeScript, Vite, and Tailwind CSS.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

**Specification:** See [SPECIFICATION.md](SPECIFICATION.md) for the original academic brief and detailed rules.

---

## Features

- Dashboard with live stock stats, active issues, and overdue alerts
- Issue books by member ID and book number
- Return issued books with automatic fine calculation (₹2/day post-grace)
- Searchable book inventory
- Member directory and records view
- Full issue history with status badges and return tracking
- Toast notifications for all actions and validation errors

## Tech stack

| Tool | Version |
|---|---|
| React | 19 |
| TypeScript | 5.5 |
| Vite | 5 |
| Tailwind CSS | 3 |
| Lucide React | 0.468+ |

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is sufficient)

### 1. Set up the database

1. Create a new project in the [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor → New query**
3. Paste and run the contents of `supabase/schema.sql`

This creates the `book`, `member`, and `issue` tables, both PL/pgSQL triggers, RLS policies, and seed data.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the two values from **Project Settings → API** in your Supabase dashboard:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run locally

```bash
npm run dev
```

Served by Vite on [http://localhost:3000](http://localhost:3000).

### Type-check

```bash
npm run lint
```

Runs `tsc --noEmit` — no files are emitted, only type errors are reported.

### Build for production

```bash
npm run build
```

Output is written to `dist/`. Type-checking runs as part of the build.

### Preview production build

```bash
npm run preview
```

## Project structure

```
.
├── index.html               ← Vite HTML entry
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
├── .env.example             ← copy to .env and fill in Supabase credentials
├── supabase/
│   └── schema.sql           ← run this in Supabase SQL Editor first
└── src/
    ├── App.tsx              ← dashboard, all views, Supabase queries
    ├── main.tsx             ← React 19 createRoot entrypoint
    ├── index.css            ← Tailwind directives + global styles
    ├── types.ts             ← shared TypeScript interfaces (Book, Member, Issue…)
    └── lib/
        └── supabase.ts      ← typed Supabase client singleton
```

## Notes

- Never commit `.env` — it contains your Supabase anon key. It is already in `.gitignore`.
- The anon key is safe to use client-side; Row Level Security on all three tables controls what the frontend can access.
- Supabase Realtime is enabled — changes made in one browser tab are reflected instantly in all others.
- Fine calculation runs entirely inside a PostgreSQL trigger (`fn_return_book`) on the database, matching the original Oracle spec.
- `npm run lint` runs `tsc --noEmit` — type errors only, no files emitted.

## License

[MIT](LICENSE)
