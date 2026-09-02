# AMATIS

**Rasha Amatis Employee Performance Management System**

سیستم مدیریت عملکرد، تسک، کنترل کیفیت و ارزیابی کارشناسان روانشناسی

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** NestJS, Prisma ORM, PostgreSQL
- **Infrastructure:** Docker Compose, Redis, MinIO

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
docker compose up -d
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

### 4. Database Setup

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Run Development

```bash
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000
- **Swagger:** http://localhost:4000/api/docs

## Demo Accounts

| Role | Mobile | Password |
|------|--------|----------|
| Admin | 09120000001 | Admin@123456 |
| Executive | 09120000002 | Executive@123456 |
| Supervisor | 09120000003 | Supervisor@123456 |
| Employee | 09120000004 | Employee@123456 |

## Project Structure

```
AMATIS/
├── apps/
│   ├── api/          # NestJS REST API
│   └── web/          # Next.js Frontend
├── packages/
│   ├── shared/       # Shared constants & utilities
│   └── types/        # Shared TypeScript types
├── docs/             # Architecture documentation
└── docker-compose.yml
```

## Documentation

- [Architecture](docs/architecture.md)
- [Database Design](docs/database.md)
- [API Reference](docs/api.md)
- [Roles & Permissions](docs/roles-permissions.md)
- [KPI Engine](docs/kpi-engine.md)
- [Workflows](docs/workflows.md)

## Development Phases

- [x] **Phase 1:** Foundation (Auth, Users, Employees, Projects, Settings)
- [x] **Phase 2:** Task Management (Templates, Assignment, Workflow, Revisions, Files)
- [x] **Phase 3:** Performance (Daily/Weekly Checklists, Evaluations, Quality Control, Psychometric, Training)
- [x] **Phase 4:** Analytics (KPI Engine, Dashboard, Monthly Reviews, Reports)
- [x] **Phase 5:** Notifications (Center, unread count, status alerts)
- [x] **Phase 6:** Hardening (Rate limiting, Data scope, Critical Incidents, Tests)

## API Modules

| Module | Prefix | Access |
|--------|--------|--------|
| Auth | `/api/v1/auth` | Public + Auth |
| Employees | `/api/v1/employees` | Role-scoped |
| Projects | `/api/v1/projects` | Admin/CEO |
| Task Templates | `/api/v1/task-templates` | Auth |
| Tasks | `/api/v1/tasks` | Role-scoped |
| Checklists | `/api/v1/checklists` | Self/Supervisor |
| Evaluations | `/api/v1/evaluations` | Supervisor+ |
| Quality Control | `/api/v1/quality-control` | Supervisor+ |
| Psychometric | `/api/v1/psychometric` | Role-scoped |
| Training | `/api/v1/training` | Role-scoped |
| KPI | `/api/v1/kpi` | Admin+ |
| Dashboard | `/api/v1/dashboard` | Auth |
| Monthly Reviews | `/api/v1/monthly-reviews` | Admin/CEO |
| Notifications | `/api/v1/notifications` | Auth (self) |
| Critical Incidents | `/api/v1/critical-incidents` | Supervisor+ |
| Audit Logs | `/api/v1/audit-logs` | SUPER_ADMIN |
| Settings | `/api/v1/settings` | SUPER_ADMIN |

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/login` | ورود با شماره موبایل |
| `/dashboard` | داشبورد نقش‌محور با نمودارها |
| `/my-tasks` | تسک‌های من (کارشناس) |
| `/tasks/:id` | جزئیات تسک + گردش کار |
| `/calendar` | تقویم کاری |
| `/my-checklist/daily` | چک‌لیست روزانه |
| `/my-checklist/weekly` | چک‌لیست هفتگی |
| `/my-performance` | عملکرد شخصی + KPI |
| `/my-training` | آموزش‌های من |
| `/notifications` | مرکز اعلان‌ها |
| `/admin/task-templates` | بانک قالب تسک‌ها |
| `/admin/evaluations` | ارزیابی‌ها |
| `/admin/reports` | گزارش‌ها + خروجی CSV |
| `/admin/employees` | مدیریت کارمندان |
| `/admin/projects` | مدیریت پروژه‌ها |
| `/admin/settings` | تنظیمات |

## Tests

```bash
npm test --workspace=@amatis/api   # 16 unit tests (incl. KPI engine)
```

Acceptance flow verified end-to-end (login → assign → start → submit → revision → approve → KPI → review → dashboard).

## License

Proprietary — Rasha Amatis
