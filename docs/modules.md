# Modules Documentation

## Backend Modules (NestJS)

### Phase 1 — Implemented

| Module | Path Prefix | Description |
|--------|-------------|-------------|
| AuthModule | `/api/v1/auth` | Mobile+password login, JWT, refresh, password change |
| UsersModule | `/api/v1/users` | User CRUD, activate/deactivate |
| EmployeesModule | `/api/v1/employees` | Staff management, profile, supervisor assignment |
| ProjectsModule | `/api/v1/projects` | Project CRUD, members |
| SettingsModule | `/api/v1/settings` | System configuration |
| AuditLogsModule | `/api/v1/audit-logs` | Audit trail (SUPER_ADMIN only) |
| HealthModule | `/api/v1/health` | Health check |

### Phase 2 — Implemented

| Module | Path Prefix | Description |
|--------|-------------|-------------|
| TaskTemplatesModule | `/api/v1/task-templates` | Task master bank (40 seeded templates) |
| TasksModule | `/api/v1/tasks` | Assignment, workflow, status, progress, revisions, comments, files |

### Phase 3 — Implemented

| Module | Path Prefix | Description |
|--------|-------------|-------------|
| ChecklistsModule | `/api/v1/checklists` | Daily & weekly checklists with auto completion % |
| EvaluationsModule | `/api/v1/evaluations` | Supervisor evaluation (10 criteria, score100) |
| QualityControlModule | `/api/v1/quality-control` | QC records with error flags & score |
| PsychometricModule | `/api/v1/psychometric` | Assessment cases (Case ID only — no PII) |
| TrainingModule | `/api/v1/training` | Training & development |
| CriticalIncidentsModule | `/api/v1/critical-incidents` | Incident registry affecting KPI penalty |

### Phase 4 — Implemented

| Module | Path Prefix | Description |
|--------|-------------|-------------|
| KpiModule | `/api/v1/kpi` | KPI engine, configurable weights, penalty, recalculation |
| DashboardModule | `/api/v1/dashboard` | Aggregated executive, charts, supervisor APIs |
| MonthlyReviewsModule | `/api/v1/monthly-reviews` | Monthly review generation + listing |
| ReportsModule | Frontend CSV export | Performance reports |

### Phase 5 — Implemented

| Module | Path Prefix | Description |
|--------|-------------|-------------|
| NotificationsModule | `/api/v1/notifications` | Notification center, unread count, mark read |

## Frontend Pages (Next.js)

### Phase 1

| Route | Role | Description |
|-------|------|-------------|
| `/login` | Public | Mobile + password login |
| `/change-password` | Auth | Force password change |
| `/dashboard` | All | Role-based dashboard redirect |
| `/admin/employees` | Admin | Staff management |
| `/admin/projects` | Admin | Project management |
| `/admin/settings` | Admin | System settings |
| `/profile` | All | User profile |

### Phase 2+

| Route | Role | Description |
|-------|------|-------------|
| `/my-tasks` | Employee | Task list with status filters |
| `/tasks/:id` | Employee | Task detail + workflow + files + revisions |
| `/calendar` | Employee | Work calendar with deadlines |
| `/my-checklist/daily` | Employee | Daily checklist |
| `/my-checklist/weekly` | Employee | Weekly checklist + self assessment |
| `/my-performance` | Employee | Personal KPI & performance |
| `/my-training` | Employee | Training records |
| `/notifications` | All | Notification center |
| `/admin/task-templates` | Admin/Sup | Task master bank |
| `/admin/evaluations` | Admin/Sup | Supervisor evaluations |
| `/admin/reports` | Admin/CEO | Monthly performance reports + CSV |

## Shared Packages

### @amatis/types
Shared TypeScript interfaces for API request/response types.

### @amatis/shared
Constants (roles, statuses, KPI weights defaults), validators, utilities.
