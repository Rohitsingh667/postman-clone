## Quick start (local)

- Requirements
  - Node 20.x
  - A Postgres URL (Neon works great)
- Setup

  - Create `.env.local` in the project root with:
    - `DATABASE_URL=postgresql://user:pass@host/db?sslmode=require`
  - Install deps: `npm install`
  - Dev: `npm run dev` → open `http://localhost:3000/client`
  - Build: `npm run build`
  - Start: `npm start`

- Frontend page: `pages/client.tsx`
  - Method picker (GET/POST/PUT/DELETE), URL box, headers/body editors
  - JSON toggle + validation, Ctrl/Cmd+Enter to send
  - Pretty‑printed response, copy buttons, small quality‑of‑life bits
  - History with infinite scroll and method filters
- API routes
  - `POST /api/proxy` (pages/api/proxy.ts) → sends your request, logs it
  - `GET /api/history` (pages/api/history.ts) → paginated history
  - `GET /api/history/[id]` → full record
- Database/ORM
  - MikroORM config: `mikro-orm.config.ts`
  - ORM bootstrap: `src/server/orm.ts` (singletons + schema sync)
  - Entity schema: `src/server/entities/RequestLog.ts`

## How MikroORM is used

- We use an EntitySchema `RequestLog` backed by Postgres to store:
  - method, url, request/response headers, request/response body, status, duration, createdAt
- On every proxy call, we create a `RequestLog` record. The ORM is initialized once per server process, and we auto‑sync schema (`updateSchema`) on boot to keep things simple during dev.
- Config pulls `DATABASE_URL` and enables SSL (handy for Neon).

## Handling large datasets efficiently

- Pagination in the API:
  - `GET /api/history?page=1&pageSize=20` (max pageSize=100)
  - DB does `order by createdAt desc` with `limit/offset`
- Lazy loading (infinite scroll) in the UI:
  - The client uses `useSWRInfinite` to fetch the next page only when you scroll near the end
- Caching:
  - `swr` caches responses and reuses them while revalidating in the background
- Light list rows:
  - History list only returns summary fields (id, method, url, status, durationMs, createdAt). Full payloads are fetched on demand via `/api/history/[id]` when you open a log.
