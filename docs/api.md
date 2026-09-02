# API Documentation

Base URL: `http://localhost:4000/api/v1`

Swagger UI: `http://localhost:4000/api/docs`

## Standard Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error
```json
{
  "success": false,
  "message": "پیام خطا",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "mobile", "message": "شماره موبایل نامعتبر است" }
  ]
}
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

## Phase 1 Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with mobile + password |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout current session |
| POST | `/auth/logout-all` | Logout all sessions |
| POST | `/auth/change-password` | Change password |
| GET | `/auth/me` | Get current user |

### Users (SUPER_ADMIN)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users (paginated) |
| GET | `/users/:id` | Get user |
| PATCH | `/users/:id` | Update user |
| PATCH | `/users/:id/activate` | Activate user |
| PATCH | `/users/:id/deactivate` | Deactivate user |
| POST | `/users/:id/reset-password` | Reset password |

### Employees
| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/employees` | List employees | Admin: all, Supervisor: team |
| POST | `/employees` | Create employee + user | Admin |
| GET | `/employees/:id` | Get employee | Scoped |
| PATCH | `/employees/:id` | Update employee | Admin / Self (limited) |
| DELETE | `/employees/:id` | Soft delete | Admin |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Soft delete |

### Settings (SUPER_ADMIN)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Get all settings |
| GET | `/settings/:key` | Get setting by key |
| PUT | `/settings/:key` | Update setting |
| GET | `/settings/categories` | Get task categories |
| GET | `/settings/priorities` | Get priorities |

### Audit Logs (SUPER_ADMIN)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit-logs` | List audit logs (paginated, filterable) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## Pagination

Query params: `?page=1&limit=20&sort=createdAt&order=desc`

## Filtering

Common filters: `?search=...&status=...&projectId=...&employeeId=...&dateFrom=...&dateTo=...`
