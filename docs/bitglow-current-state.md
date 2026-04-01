## BitGlow - Current State

### What exists
- Backend: Node.js + Fastify (TypeScript), REST routes in `bitglow-backend/src/routes`
- Auth: JWT via `jsonwebtoken` (auth routes present)
- Core modules:
  - routes: auth, user, profile
  - websocket: `bitglow-backend/src/ws`
  - services: db (Postgres via `pg`), store
- Frontend: React + Vite + Tailwind, React Router
- DB: Postgres (via `pg`)

### What NOT to change
- Auth flow (JWT)
- DB schema (for now)

### Known issues / risks (needs verification)
- Profile update validation: no update route found yet, likely needs validation when added
- WebSocket auth: review required

### Goals next
- Improve profile system
- Add feature X (define)
- Improve security
