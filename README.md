# TestPad Admin Dashboard

A modern admin dashboard for managing Testpad projects, folders, scripts, runs, and analytics. Connects directly to the Testpad API via a proxy and provides optimized data loading with rich visualizations.

## Overview

- Select multiple projects and folders to analyze the latest test runs.
- Visualize totals, pass/fail/blocked/query counts, completion rate, and result distribution.
- Create a “Test Round” by duplicating a folder’s scripts and auto-creating assigned runs.
- Browse projects with a simplified tree that includes latest run metadata.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI) + Lucide Icons
- React Router DOM
- TanStack Query (React Query)
- Recharts
- React Hook Form + Zod

## Quick Start

1. Install dependencies:
   
```bash
npm install
```

2. Configure your Testpad API key inside the app:
   - Open the app and go to the “Connect” screen
   - Paste your API key; it is stored in localStorage

3. Start the dev server:
   
```bash
npm run dev
```

4. Open:
   
```
http://localhost:5173
```

## Environment & API

- Base URL is proxied via Vite:
  - Dev: `/api/api/v1` → `https://api.testpad.com/api/v1`
  - Configure in [vite.config.ts](file:///Users/saurabhperson/Desktop/testpad-dash/vite.config.ts)
- All requests include `Authorization: apikey <TOKEN>` and `X-API-Key` headers.
- API key is managed by [testpad-api.ts](file:///Users/saurabhperson/Desktop/testpad-dash/src/lib/testpad-api.ts).

## Core Pages

- Connect: [ConnectScreen.tsx](file:///Users/saurabhperson/Desktop/testpad-dash/src/pages/ConnectScreen.tsx)
- Dashboard: [Dashboard.tsx](file:///Users/saurabhperson/Desktop/testpad-dash/src/pages/Dashboard.tsx)
- Projects: [ProjectList.tsx](file:///Users/saurabhperson/Desktop/testpad-dash/src/pages/ProjectList.tsx)
- Project Detail: [ProjectDetail.tsx](file:///Users/saurabhperson/Desktop/testpad-dash/src/pages/ProjectDetail.tsx)
- Script Detail: [ScriptDetail.tsx](file:///Users/saurabhperson/Desktop/testpad-dash/src/pages/ScriptDetail.tsx)
- Create Test Round: [CreateTestRound.tsx](file:///Users/saurabhperson/Desktop/testpad-dash/src/pages/CreateTestRound.tsx)

## Data Loading Strategy

- Projects: single lightweight fetch.
- Folders/scripts: fetched only when needed.
- Simplified folder tree uses `runs=full` to include latest run status inline.
- Dashboard aggregates latest run progress metrics and supports deep failure analysis on demand.

## API Endpoints Used

- Get projects: `GET /projects`
- Get project: `GET /projects/{id}`
- Get folders: `GET /projects/{id}/folders` with parameters:
  - `runs=full`, `subfolders=all`, `scripts=terse`, `progress=full`
- Get script: `GET /scripts/{id}?runs=full&tests=full`
- Create folder: `POST /projects/{id}/folders`
- Create script in folder: `POST /projects/{id}/folders/{folderId}/scripts`

## Create Test Round Workflow

1. Select a project and a source folder.
2. Name the new round; optionally select multiple testers.
3. The app creates a new folder.
4. Each script in the source folder is duplicated into the new folder.
5. A run is created with assigned tester(s) and headers.

Implemented in [testpad-api.ts](file:///Users/saurabhperson/Desktop/testpad-dash/src/lib/testpad-api.ts#L273-L455) and wired in [CreateTestRound.tsx](file:///Users/saurabhperson/Desktop/testpad-dash/src/pages/CreateTestRound.tsx).

## Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`
- Lint: `npm run lint`

## Project Structure

```
src/
├── components/
│   ├── charts/           # Recharts components
│   ├── layout/           # Header, BottomNav
│   ├── ui/               # shadcn/ui primitives & feature UIs
├── hooks/                # Custom hooks
├── lib/                  # API client, helpers
├── pages/                # Route pages
├── types/                # TypeScript interfaces
└── App.tsx               # Routes configuration
```

## Troubleshooting

- 401 errors: re-enter a valid API key on the Connect screen.
- 429 errors: the client uses backoff, but heavy operations may need retries.
- If CORS blocks requests, ensure Vite proxy is running and configured.

## Security

- Do not commit secrets; API key is stored in localStorage and sent via headers.
- No secrets are written to repo files.

## License

Private and proprietary.
