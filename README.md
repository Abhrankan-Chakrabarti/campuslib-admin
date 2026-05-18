# Geometric Admin Dashboard

A lightweight React + Vite admin dashboard for a library management system. The app is built with TypeScript, React 19, Vite, Tailwind CSS and Lucide icons, and uses seeded client-side data for books, members, and issue history.

## Features

- Dashboard view with stock stats, active issues, overdue alerts, and recent transactions
- Issue new books by member ID and book number
- Return issued books with fine calculation
- Searchable book inventory
- Member directory and records view
- Full issue history with status badges and return tracking
- Toast notifications for actions and errors

## Tech stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons

## Getting started

### Prerequisites

- Node.js 18+ (or compatible)

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The app will be served by Vite, by default on port `3000`.

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project structure

```
.
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx      ← main dashboard app and view routing
    ├── main.tsx     ← React entrypoint
    └── index.css    ← global styles and Tailwind import
```

## Notes

- The app uses local seed data in `src/App.tsx` and does not require an API key or backend server.
- Data changes are stored only in memory during the current browser session.
- `npm run lint` runs TypeScript type checking with `tsc --noEmit`.
