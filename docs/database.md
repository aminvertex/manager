# Database Design

## ERD Overview

```mermaid
erDiagram
    User ||--o| EmployeeProfile : has
    User ||--o{ RefreshToken : has
    User ||--o{ Notification : receives
    User ||--o{ AuditLog : performs
    Role ||--o{ UserRole : assigned
    User ||--o{ UserRole : has

    EmployeeProfile ||--o{ TaskAssignment : assigned
    EmployeeProfile ||--o| EmployeeProfile : supervised_by
    EmployeeProfile ||--o{ DailyChecklist : completes
    EmployeeProfile ||--o{ WeeklyChecklist : completes
    EmployeeProfile ||--o{ EmployeeKPI : has
    EmployeeProfile ||--o{ Training : attends
    EmployeeProfile ||--o{ PsychometricCase : handles

    Project ||--o{ TaskTemplate : contains
    Project ||--o{ TaskAssignment : scoped
    Project ||--o{ ProjectMember : has
    Project ||--o{ ProjectPerformance : tracks

    TaskTemplate ||--o{ TaskAssignment : instantiated
    TaskAssignment ||--o{ TaskStatusHistory : logs
    TaskAssignment ||--o{ TaskRevision : has
    TaskAssignment ||--o{ TaskAttachment : has
    TaskAssignment ||--o| SupervisorEvaluation : evaluated
    TaskAssignment ||--o| QualityControl : qc

    SupervisorEvaluation ||--o{ SupervisorEvaluationItem : criteria
    DailyChecklist ||--o{ DailyChecklistItem : items
    KPIConfiguration ||--o{ EmployeeKPI : calculates
    CriticalIncident ||--o| EmployeeProfile : affects
    MonthlyReview ||--o| EmployeeProfile : summarizes
```

## Core Entities (Phase 1)

### User
- Authentication account (mobile + password hash)
- Links to EmployeeProfile
- Roles via UserRole junction

### Role
- SUPER_ADMIN, CEO, SUPERVISOR, EMPLOYEE
- Permissions via RolePermission

### EmployeeProfile
- Extended profile (name, personnel code, supervisor, projects, etc.)
- One-to-one with User

### Project
- Project master data with code, status, manager

### Setting
- Key-value configuration store for system settings

## Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| users | mobile (unique) | Login lookup |
| task_assignments | employeeId, status, deadline | My Tasks queries |
| task_assignments | projectId | Project filters |
| notifications | userId, isRead | Notification center |
| employee_kpis | employeeId, period | KPI dashboard |
| audit_logs | userId, createdAt | Audit queries |

## Soft Delete Policy

Entities with `deletedAt`:
- User, EmployeeProfile, Project, TaskTemplate, TaskAssignment

Entities with `isActive`:
- Project, TaskTemplate, User

## Privacy Rules

- **PsychometricCase**: Only `caseId` — NO client PII
- Audit logs: No password values
- File metadata only in DB; content in MinIO

## Date Storage

- All dates stored as `DateTime` (UTC) in PostgreSQL
- Display converted to Jalali in frontend
- Timezone configurable via `TIMEZONE` env
