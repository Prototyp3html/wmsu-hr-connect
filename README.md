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

## Web app mode

Build the frontend and backend into a single browser-hosted app:

```sh
npm run build:web
```

Start the web app server:

```sh
npm run start:web
```

One-click launcher for non-technical users:

- Double-click `start-web-app.cmd`
- It starts the local server and opens the app in your browser

This is the recommended option if you want it to feel like a normal web app without paying for code signing yet.

Desktop icon setup:

- Double-click `Create Desktop Shortcut.cmd` once
- It creates a `WMSU HR Connect` icon on the desktop
- HR staff can then open the system by clicking that desktop icon

## Workspace layout

- frontend/ - React + TypeScript + Vite UI
- backend/ - Express API + SQLite

## Default credentials (seeded)

- Admin: admin@wmsu.edu.ph / password123
- Staff: hrstaff@wmsu.edu.ph / password123
