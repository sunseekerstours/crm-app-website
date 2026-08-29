# Sunseekers Travel Management Platform

Headless, modular-monolith travel operations platform built according to the
Sunseekers Travel PRD v1.0. This repository currently delivers **Phase 0
(Foundation)** and **Phase 1 / Task 2 (Authentication, Users, Roles,
Permissions, Audit)** of the central backend.

The platform is designed to be the **single source of truth** and to be consumed
by multiple clients (Staff Web CRM, Staff Mobile, and later a Public Website and
Customer Portal) over the same versioned REST API. Clients never access the
database directly.

---

## Architecture

```
                STAFF WEB CRM          STAFF MOBILE         (future) PUBLIC WEBSITE
                       \                     /                          /
                        \___________________/__________________________/
                                            |
                                         HTTPS  /api/v1
                                            |
                                    API GATEWAY / Backend (NestJS)
                                            |
                              +-------------+-------------+
                              |             |             |
                         PostgreSQL       Redis        Object Storage (future)
```

- **Backend:** NestJS + TypeScript (modular monolith, not microservices)
- **Database:** PostgreSQL 16 (Prisma ORM)
- **Cache / Queue:** Redis (BullMQ-ready; used for rate limiting/cache foundation)
- **Auth:** JWT access tokens + rotating refresh tokens, RBAC permissions

Key architectural rules from the PRD enforced here:

- All responses use the standard envelope `{ data, meta }` / `{ error: { code, message } }`.
- All APIs are versioned under `/api/v1`.
- All important security actions are written to an audit log table.
- Refresh tokens are stored hashed; rotation invalidates the previous token.
- No business logic is duplicated into clients (backend-only).

---

## Repository layout

```
apps/
  backend/            NestJS central backend API (workspace @sunseekers/backend)
    prisma/           Database schema + migrations
    scripts/seed.ts   Seeding of system roles, permissions, and admin user
    src/
      common/         Decorators, guards, interceptors, filters, DTOs, permissions
      config/         Environment configuration
      prisma/         PrismaService (global)
      modules/
        auth/         Login, refresh, logout, password reset, JWT strategy
        users/        User CRUD + role assignment
        roles/        Role & permission listing
        health/       Health checks (DB + Redis)
        audit/        Audit log service (global)
        redis/        Redis service (global, graceful degradation)
docker/
  compose.yml         PostgreSQL + Redis for local development
infra/ci/             CI/pipeline notes
docs/                 PRD & execution notes
```

---

## Prerequisites

- Node.js 20+ (developed on 22)
- Docker + Docker Compose
- npm

---

## Getting started

### 1. Start infrastructure (PostgreSQL + Redis)

```bash
npm run docker:up
```

### 2. Configure environment

```bash
cd apps/backend
copy .env.example .env   # then edit secrets for your environment
```

### 3. Generate Prisma client, migrate, and seed

```bash
npm run prisma:generate
npm run prisma:migrate   # creates the first migration & applies it
npm run db:seed          # creates system roles, permissions, and an admin user
```

The seeded admin defaults to `admin@sunseeker.local` / `ChangeMe123!`
(override via `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### 4. Run the API

```bash
npm run dev              # watch mode (from apps/backend)
```

The API listens on `http://localhost:3000/api/v1` with Swagger UI at
`http://localhost:3000/api/v1/docs`.

---

## Useful scripts (run from `apps/backend`)

| Command                 | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Start API in watch mode                 |
| `npm run build`         | Compile to `dist/` (resolves `@app/*`)  |
| `npm run start:prod`    | Run compiled output (`node dist/main.js`) |
| `npm test`              | Unit tests                              |
| `npm run test:e2e`      | End-to-end tests (needs DB + Redis)     |
| `npm run lint`          | ESLint + Prettier                       |
| `npm run db:seed`       | Seed roles, permissions, admin          |
| `npx prisma studio`     | Inspect data in browser                 |

From the repository root, the same scripts are exposed via workspaces
(e.g. `npm run docker:up`, `npm run lint`, `npm run test`).

---

## API overview

All endpoints are under `/api/v1`. Authentication is Bearer token (JWT).

### Health
- `GET /api/v1/health` — status of API, DB, and Redis (public)

### Auth
- `POST /auth/login` — email/password login → access + refresh tokens
- `POST /auth/refresh` — rotate refresh token
- `POST /auth/logout` — revoke the given refresh token
- `POST /auth/logout-all` — revoke all sessions for the caller
- `POST /auth/password-reset/request` — request a reset (never leaks existence)
- `POST /auth/password-reset/complete` — reset password with a token
- `GET /auth/me` — current profile with roles and permissions

### Users
- `POST /users` — create user (`users.create`)
- `GET /users` — list users (`users.view`)
- `GET /users/:id` — get user (`users.view`)
- `PATCH /users/:id` — update user (`users.update`)
- `POST /users/:id/roles` — assign role (`users.assign_role`)
- `DELETE /users/:id/roles/:roleId` — remove role (`users.assign_role`)

### Roles
- `GET /roles` — list roles with permissions (`roles.view`)
- `GET /roles/:id` — get role (`roles.view`)

### Response standard

Success:
```json
{ "data": { }, "meta": { "requestId": "..." } }
```

Error:
```json
{ "error": { "code": "BOOKING_NOT_FOUND", "message": "..." }, "meta": { "requestId": "..." } }
```

Paginated list responses carry `{ items, total, page, limit, totalPages }`.

### Permissions

Access control is enforced globally. Role definitions and permission keys live in
`src/common/roles.ts` and `src/common/permissions.ts`. Initial system roles
(per PRD section 20): `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `SALES_AGENT`,
`OPERATIONS_STAFF`, `FINANCE`, `TOUR_GUIDE`, `DRIVER`.

---

## Testing

- **Unit tests:** `npm test` — auth service and permissions guard.
- **E2E tests:** `npm run test:e2e` — full auth flow against a real DB:
  login, protected routes (401), invalid credentials (401), profile, refresh
  rotation, logout, and password-reset non-leak.
- **CI:** `.github/workflows/ci.yml` runs lint → build → unit → migrate → seed →
  e2e with PostgreSQL/Redis service containers.

---

## PRD execution roadmap

The PRD defines an execution order (`docs/PRD-roadmap.md`). Current status:

| Phase   | Scope                                              | Status       |
| ------- | -------------------------------------------------- | ------------ |
| Phase 0 | Backend foundation, Docker, config, logging, health, CI | ✅ Done      |
| Task 2  | Auth, users, roles, permissions, audit            | ✅ Done      |
| Task 3  | CRM Core (customers, companies, leads, deals, activities, tasks) | ⏳ Next |
| Task 4  | Travel Core (destinations, tours, itineraries, departures) | ⬜ Pending |
| Task 5  | Bookings, travelers, quotes, invoices, payments   | ⬜ Pending |
| Task 6  | Operations (hotels, vehicles, drivers, guides, suppliers) | ⬜ Pending |
| Task 7  | Staff CRM Web App (Next.js)                       | ⬜ Pending |
| Task 8  | Staff Mobile App (Flutter)                        | ⬜ Pending |

See `docs/` for the full PRD and the per-task specification format.
