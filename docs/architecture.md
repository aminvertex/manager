# AMATIS Architecture

## Overview

AMATIS (Rasha Amatis Employee Performance Management System) is a monorepo application for managing psychologist employee performance, tasks, quality control, and KPI evaluation.

## Monorepo Structure

```
AMATIS/
├── apps/
│   ├── api/          # NestJS REST API
│   └── web/          # Next.js App Router frontend
├── packages/
│   ├── shared/       # Shared utilities and constants
│   └── types/        # Shared TypeScript types
├── docs/             # Architecture documentation
├── docker-compose.yml
└── package.json
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, Prisma ORM, PostgreSQL |
| Auth | JWT + Refresh Tokens, Argon2/bcrypt |
| Cache/Queue | Redis |
| File Storage | MinIO (S3-compatible) |
| Containerization | Docker Compose |

## Architecture Principles

1. **Backend is source of truth** — Business logic (KPI, delays, permissions) lives in the API
2. **Data scope enforcement** — RBAC + row-level scope in backend guards/services
3. **Soft delete** — Critical entities use `deletedAt` / `isActive`
4. **Audit everything important** — Password changes, role changes, task status, etc.
5. **Configurable business rules** — KPI weights, thresholds, classifications in DB
6. **Modular NestJS modules** — One module per domain
7. **Aggregated dashboard APIs** — Avoid N+1 queries from frontend

## Request Flow

```
Client (Next.js)
    ↓ HTTP/REST
NestJS Controller
    ↓ DTO Validation (class-validator)
Guard (JWT + Roles + DataScope)
    ↓
Service (Business Logic)
    ↓
Prisma Repository
    ↓
PostgreSQL
```

## Module Map (Backend)

| Module | Responsibility |
|--------|---------------|
| auth | Login, logout, refresh, password change |
| users | User account management |
| employees | Employee profiles, staff management |
| projects | Project CRUD, members |
| task-templates | Task master bank |
| tasks | Assignment, workflow, revisions |
| checklists | Daily/weekly checklists |
| evaluations | Supervisor evaluation |
| quality-control | QC records |
| psychometric | Assessment cases (Case ID only) |
| training | Training & development |
| kpi | KPI engine & configuration |
| performance | Project/employee performance |
| monthly-reviews | Monthly review generation |
| notifications | Notification center + jobs |
| audit-logs | Audit trail |
| settings | System configuration |
| dashboard | Aggregated analytics APIs |
| reports | Export PDF/Excel/CSV |
| files | MinIO upload/download |

## Deployment Topology (Production)

```
[Browser] → [Next.js] → [NestJS API] → [PostgreSQL]
                              ↓
                         [Redis] [MinIO]
```

## Phase Roadmap

- **Phase 1** (Current): Foundation — Auth, Users, Employees, Projects, Settings
- **Phase 2**: Task Management — Templates, Assignment, Workflow, Files, Revisions
- **Phase 3**: Performance — Checklists, Evaluations, QC, Psychometric, Training
- **Phase 4**: Analytics — KPI Engine, Dashboards, Reports, Monthly Reviews
- **Phase 5**: Notifications — Center, Cron jobs, Reminders
- **Phase 6**: Hardening — Security audit, E2E tests, Performance optimization
