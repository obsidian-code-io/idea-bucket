# Idea Bucket

A small, shared place for an engineering team to drop ideas. Each idea belongs
to a creator, gets a short shareable public URL, can hold any number of
attachments (uploaded files and in-browser voice recordings), and lives on a
kanban board so the team can track its status. Everything lands in one bucket:
one SQLite database and one uploads directory, both on a single volume.

## Stack

- **Runtime:** [Bun](https://bun.sh) (built-in `bun:sqlite`, no native compile step)
- **Server:** [Hono](https://hono.dev) with Hono JSX for server-rendered HTML
- **Interactivity:** [HTMX](https://htmx.org) (vendored locally in `public/`)
- **Board drag/drop:** [SortableJS](https://sortablejs.github.io/Sortable/) (vendored locally)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/cli`, built to `public/styles.css`
- **DB:** SQLite via `bun:sqlite`
- **Validation:** [zod](https://zod.dev) · **IDs:** [nanoid](https://github.com/ai/nanoid)

No CDNs, no ORM, no external services. Raw SQL through `bun:sqlite`.

## Running locally

### With Docker (recommended)

The production `docker-compose.yml` only `expose`s the port (Dokploy/Traefik
does the routing). For local testing, layer on `docker-compose.local.yml`, which
publishes `3000:3000` and fills in safe default env values:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Then open <http://localhost:3000>. Basic Auth is on by default — sign in with
`team` / `change-me` (overridable via env). On first load you'll get the
onboarding panel; after that the board is yours.

Data (SQLite file + uploads) persists in the named volume `idea-bucket-data`
across restarts and rebuilds.

### With Bun directly (no Docker)

```bash
bun install
bun run build:css        # builds public/styles.css
# point the app at a local data dir and disable the team gate for convenience:
DATA_DIR=./data DB_PATH=./data/idea-bucket.db UPLOAD_DIR=./data/uploads \
  ENABLE_BASIC_AUTH=false COOKIE_SECRET=dev-secret \
  bun run start
```

`bun run dev` runs the same with `--watch`. Note: the CSS build (`build:css`)
is a separate step — re-run it after changing markup/classes, or run
`bunx @tailwindcss/cli -i styles/input.css -o public/styles.css --watch` in a
second terminal.

## Environment variables

All are documented in `.env.example`:

| Var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `/data` | Base data directory (created on boot) |
| `DB_PATH` | `/data/idea-bucket.db` | SQLite file path |
| `UPLOAD_DIR` | `/data/uploads` | Where attachment files live |
| `MAX_UPLOAD_MB` | `25` | Per-file upload limit |
| `ENABLE_BASIC_AUTH` | `false`* | Toggle the team-wide HTTP Basic Auth gate |
| `APP_BASIC_AUTH_USER` | `team` | Basic Auth username |
| `APP_BASIC_AUTH_PASS` | `change-me` | Basic Auth password |
| `COOKIE_SECRET` | _(dev fallback)_ | Signs the identity cookie — set a long random string in prod |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Used to build shareable idea links |

\* `ENABLE_BASIC_AUTH` is `true` in both compose files; it defaults to `false`
when running `bun` directly with no env set.

## How it works

### Identity & access — two layers

1. **Team-wide gate (optional).** When `ENABLE_BASIC_AUTH=true`, the whole app
   (except `/healthz`) sits behind HTTP Basic Auth using `APP_BASIC_AUTH_USER` /
   `APP_BASIC_AUTH_PASS`.
2. **Per-user identity.** On first visit with no identity cookie, a
   non-dismissable onboarding panel collects **username**, **email**, and
   **phone** (validated with zod). On submit the app upserts a `users` row keyed
   by email — if the email already exists it reuses that user's ID and updates
   the name/phone — then sets a signed cookie (`COOKIE_SECRET`) holding the user
   ID. Every idea records `creator_id` + `creator_name`. The header shows the
   username and ID with a **Change details** link that clears the cookie and
   reopens the panel.

### Board & ideas

- `GET /` — kanban board. Columns: `backlog → in_review → approved →
  in_progress → done`. Drag a card between columns (SortableJS) to change its
  status, or use the per-card dropdown as a no-JS fallback. Both call
  `PATCH /ideas/:id/status`.
- `GET /ideas/new`, `POST /ideas` — create via the modal; the new card is added
  to the Backlog column via an HTMX out-of-band swap.
- `GET /i/:publicId` — shareable detail page (full description, attachments,
  status, creator, share link). Only the creator sees the upload/record/delete
  controls; everyone behind the gate can view.
- `DELETE /ideas/:id` — deletes the idea, cascades attachment rows, and removes
  the physical files from the volume.

### Attachments & voice

- `POST /ideas/:id/attachments` — multipart, multiple files, any type. Each file
  is stored under a generated UUID name; the original name is kept for display
  and download. Files over `MAX_UPLOAD_MB` are rejected with an inline error.
- `POST /ideas/:id/voice` — a voice note recorded in-browser
  (`audio/webm;codecs=opus`) via `public/voice.js` (`MediaRecorder` + `fetch`,
  since HTMX can't post a recorded blob cleanly).
- `GET /attachments/:id` — streams the file with the right `Content-Type`. The
  disk path is built **only** from the stored UUID name (never user input), so
  path traversal isn't possible. Images/audio/PDF render inline; everything else
  is download-only.

## Deploying on Dokploy

- Deploy as a **Compose service** using `docker-compose.yml` (do **not** add the
  local override — production uses `expose`, not host port binding).
- In the Dokploy **Domains** tab, add your domain pointing at container port
  `3000`. Dokploy/Traefik handles routing and TLS.
- Set these environment variables in the Dokploy UI:
  `APP_BASIC_AUTH_USER`, `APP_BASIC_AUTH_PASS`, `COOKIE_SECRET` (a long random
  string), and `PUBLIC_BASE_URL` (e.g. `https://ideas.yourteam.com`).
- The single named volume `idea-bucket-data` holds both the SQLite file and the
  uploads, so data survives redeploys.
- Health checks hit `GET /healthz` (returns `200`, and is not behind the gate).

## Design notes / decisions

Where the brief left something open, these calls were made (kept minimal):

- **Public IDs** are 10-char lowercase alphanumerics from an unambiguous
  alphabet (no `0/o/1/l`).
- **Share links** still sit behind the team Basic Auth gate. The detail page is
  otherwise "public" within the team. To make links truly public, exempt
  `GET /i/:publicId` and `GET /attachments/:id` from the `gate` middleware in
  `src/index.ts` (mount them before `app.use("*", gate)`).
- **Edit permissions:** only an idea's creator can upload, record, or delete;
  anyone can view and can move any card on the board (the board is a shared
  workspace).
- **WAL mode** is enabled for SQLite for smoother concurrent reads/writes.

## Swapping Bun for Node (later)

The app is built on Bun for `bun:sqlite` and zero native compile in Docker. To
move to Node instead:

- Replace the server entry with [`@hono/node-server`](https://github.com/honojs/node-server)
  and swap `hono/bun`'s `serveStatic` for `@hono/node-server/serve-static`.
- Replace `bun:sqlite` (`src/db.ts`) with
  [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) — a near
  drop-in API (`db.prepare(...).get/all/run`).
- Replace `Bun.write` / `Bun.file` in `src/lib/storage.ts` and
  `src/routes/attachments.tsx` with `node:fs`/`node:fs/promises` streams.
- Add `build-essential` and `python3` to the build image (native modules need to
  compile).

## Upgrading to real per-user accounts (later)

Identity today is a signed cookie holding a `users.id` — no passwords, no
sessions. To make it real:

1. Add a `password_hash` column to `users` (hash with Bun's `Bun.password` /
   argon2) and a login form.
2. Add a `sessions` table (`id`, `user_id`, `created_at`, `expires_at`) and set
   the signed cookie to a session ID instead of the user ID.
3. Look sessions up in the `identity` middleware (`src/middleware/auth.ts`)
   instead of loading the user directly, and add sign-in / sign-out routes.

The onboarding panel becomes a sign-up form; everything downstream
(`creator_id` / `creator_name`, the header, "Change details") stays the same.

## Project layout

```
src/
  index.ts            bootstrap: config, db migrate, static, routes, serve
  config.ts           env parsing + validation (zod)
  db.ts               bun:sqlite connection + runs schema.sql on boot
  schema.sql          tables + indexes (idempotent)
  middleware/auth.ts  basic-auth gate + signed identity cookie
  lib/                ids, storage (path-safe), validation, time
  routes/             board, ideas, attachments, identity
  views/              layout, board, idea-detail, components (JSX)
public/               htmx.min.js, sortable.min.js, voice.js, styles.css (built)
styles/input.css      Tailwind entry
Dockerfile · docker-compose.yml · docker-compose.local.yml
```
