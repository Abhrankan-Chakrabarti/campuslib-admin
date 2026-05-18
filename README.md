# CampusLib Admin

> A lightweight admin dashboard for campus library management — built with React 19, TypeScript, Vite, and Tailwind CSS.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

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

### Install dependencies

```bash
npm install
```

### Run locally

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
└── src/
    ├── App.tsx              ← dashboard, all views, and view routing
    ├── main.tsx             ← React 19 createRoot entrypoint
    └── index.css            ← Tailwind directives + global styles
```

## Notes

- All data is seeded client-side in `src/App.tsx` — no backend or API key required.
- State is held in memory; changes reset on page refresh.
- The project is intentionally kept single-file (`App.tsx`) for simplicity. Split into separate component files as the codebase grows.

## License

[MIT](LICENSE)
