# OpenCode Task Template

Every implementation task is written in this format before coding (PRD 147).
This prevents uncontrolled architectural decisions.

---

## TASK ID

Implement ...

## Objective

One or two sentences describing the business outcome.

## Requirements

- Bullet list of concrete requirements derived from the PRD.

## Database Changes

- New models / migrations (Prisma).
- Fields, indexes, relations.

## API Changes

- New endpoints (path, method, permission) and payloads.
- Follow `/api/v1` versioning and the `{ data }` / `{ error }` response standard.

## Frontend Changes

- (If applicable) screens/components in the Staff Web CRM.

## Mobile Changes

- (If applicable) screens/features in the Staff Mobile App.

## Business Rules

- Domain rules that must be encoded (e.g. Customer != Traveler, idempotency).

## Permissions

- Permission keys required; role mappings.

## Validation

- Input validation rules and edge cases.

## Tests

- Unit + integration/e2e tests and the key scenarios covered.

## Acceptance Criteria

- Verifiable conditions that define "done" (references PRD 120).

## Non-Goals

- Explicitly out of scope for this task (e.g. do NOT build the public website).
