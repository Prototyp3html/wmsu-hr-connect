# WMSU HR Connect

Monorepo with a React (Vite) frontend and an Express + SQLite backend.

## Requirements

- Node.js LTS
- npm
- PostgreSQL

## Install

```sh
npm install
```

## Configure backend

Create a Postgres database and set the connection string in backend/.env:

```
PORT=4000
JWT_SECRET=dev_secret
TOKEN_EXPIRES_IN=7d
DATABASE_URL=postgres://postgres:password@localhost:5432/wmsu_hr_connect
```

## Run (both apps)

```sh
npm run dev
```

- Frontend: http://localhost:8080
- Backend: http://localhost:4000

## Run individually

```sh
npm run dev:frontend
npm run dev:backend
```

## Workspace layout

- frontend/ - React + TypeScript + Vite UI
- backend/ - Express API + SQLite

## Default credentials (seeded)

- Admin: admin@wmsu.edu.ph / password123
- Staff: hrstaff@wmsu.edu.ph / password123
