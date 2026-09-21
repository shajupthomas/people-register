# people-register

A small full‑stack app for keeping a register of people: add, search, edit, and remove entries. It ships with a REST API backed by SQLite and a modern React UI.

## Stack

- **Backend:** Node.js + Express, SQLite via `better-sqlite3`
- **Frontend:** React 18 + Vite + TypeScript
- **Runtime:** TypeScript executed directly with `tsx`

## Getting started

```bash
npm install        # install dependencies
npm run dev        # start API (http://localhost:3001) + web UI (http://localhost:5173)
```

The Vite dev server proxies `/api/*` to the Express API, so you only need to open http://localhost:5173.

## Scripts

| Command             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Run the API and web UI together (hot reload).           |
| `npm run dev:server`| Run only the Express API on port `3001`.                |
| `npm run dev:client`| Run only the Vite dev server on port `5173`.            |
| `npm run build`     | Build the production web bundle into `dist/client`.     |
| `npm start`         | Serve the built UI and API from Express (production).   |
| `npm run typecheck` | Type-check both the client and server.                  |
| `npm test`          | Run the end-to-end API smoke test.                      |

## API

| Method | Path               | Description                     |
| ------ | ------------------ | ------------------------------- |
| GET    | `/api/health`      | Health check.                   |
| GET    | `/api/people`      | List people (`?search=` filter).|
| POST   | `/api/people`      | Create a person.                |
| PUT    | `/api/people/:id`  | Update a person.                |
| DELETE | `/api/people/:id`  | Delete a person.                |

## Configuration

| Variable      | Default          | Description                    |
| ------------- | ---------------- | ------------------------------ |
| `SERVER_PORT` | `3001`           | Port for the Express API.      |
| `DB_PATH`     | `data/people.db` | SQLite database file location. |
