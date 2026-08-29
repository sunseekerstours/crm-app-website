# PRD Execution Roadmap

This document is a working plan derived from the Sunseekers Travel PRD v1.0.
It is used by opencode to execute the build incrementally. **Never "build
everything" at once.** Work through tasks in order, using the task template in
`TASK-TEMPLATE.md`.

## Golden rules (PRD sections 21, 74-78, 86-92, 107, 146)

1. Never bypass the architecture (modular monolith, API-first).
2. Never modify production data directly.
3. Never duplicate business logic in the frontend.
4. Never access PostgreSQL directly from client apps.
5. All business logic lives in backend modules.
6. All APIs are versioned (`/api/v1`).
7. All important actions are audited.
8. All financial operations are idempotent.
9. All sensitive documents require authorization.
10. Every module includes tests.
11. Distinguish **Customer** from **Traveler**; **Tour** from **Departure**;
    **Lead** from **Customer** (PRD 131-133).
12. Never delete financial records — use cancellation/reversal/refund with audit
    (PRD 89, 134).
13. WordPress/WP Travel Engine is a **temporary migration source**, never a
    dependency (PRD 68-69).

## Execution order & status

| # | Task | PRD refs | Status |
|---|------|----------|--------|
| 1 | Foundation: repo, Docker, backend, DB, Redis, config, logging, health, CI | 108, 148 | ✅ |
| 2 | Auth, users, roles, permissions, audit | 19-21, 109, 149 | ✅ |
| 3 | CRM Core: customers, companies, leads, deals, activities, tasks, timeline, search | 110, 150 | ✅ |
| 4 | Travel Core: destinations, tours, itineraries, departures, pricing, availability | 111, 151 | ✅ |
| 5 | Bookings, travelers, quotes, invoices, payments | 112, 152 | ✅ |
| 6 | Operations: hotels, vehicles, drivers, guides, suppliers, assignments, checklists, trip board | 113, 153 | ✅ |
| 7 | Staff CRM Web App (Next.js) | 114, 154 | ✅ |
| 8 | Staff Mobile App (React Native + Expo) | 115, 155 | ✅ |
| 9 | Automation + notifications | 116, 156 | ✅ |
| 10 | WordPress / WP Travel Engine migration tools | 117, 157 | ⬜ |
| 11 | Public API + public website | 118, 158 | ✅ |

## MVP definition (PRD 119)

MVP is complete when staff can: LOGIN → CREATE CUSTOMER → CREATE LEAD → CREATE
DEAL → CREATE TOUR → CREATE DEPARTURE → CREATE QUOTE → CONFIRM BOOKING → ADD
TRAVELERS → RECORD PAYMENT → ASSIGN HOTEL → ASSIGN VEHICLE → ASSIGN DRIVER →
ASSIGN GUIDE → CREATE OPERATIONS CHECKLIST → EXECUTE TRIP → COMPLETE TRIP.

## Definition of Done (PRD 120)

A feature is done only when it has: database model, API, validation,
authorization, UI, mobile support (if applicable), unit tests, integration
tests, audit logging, error handling, loading states, empty states, and
documentation.
