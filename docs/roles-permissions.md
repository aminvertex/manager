# Roles & Permissions Matrix

## Roles

| Role | Code | Description |
|------|------|-------------|
| Super Admin | `SUPER_ADMIN` | Full system access |
| CEO / Executive | `CEO` | Read-only dashboards & reports |
| Supervisor | `SUPERVISOR` | Team management, evaluations, QC |
| Employee / Psychologist | `EMPLOYEE` | Own tasks, checklists, profile |

## Permission Matrix

| Resource | SUPER_ADMIN | CEO | SUPERVISOR | EMPLOYEE |
|----------|:-----------:|:---:|:----------:|:--------:|
| **Users** |
| Create user | ✅ | ❌ | ❌ | ❌ |
| View all users | ✅ | ❌ | ❌ | ❌ |
| Reset password | ✅ | ❌ | ❌ | ❌ |
| **Employees** |
| Create employee | ✅ | ❌ | ❌ | ❌ |
| View all employees | ✅ | ✅ | Team only | Self only |
| Edit employee | ✅ | ❌ | ❌ | Self (limited) |
| **Projects** |
| CRUD projects | ✅ | View | View | View (assigned) |
| **Tasks** |
| Create template | ✅ | ❌ | ❌ | ❌ |
| Assign task | ✅ | ❌ | ✅ (team) | ❌ |
| View tasks | ✅ | ✅ | Team | Own |
| Execute task | ❌ | ❌ | ❌ | ✅ (own) |
| Review task | ✅ | ❌ | ✅ (team) | ❌ |
| **Checklists** |
| Submit daily | ❌ | ❌ | ❌ | ✅ (own) |
| Submit weekly | ❌ | ❌ | ❌ | ✅ (own) |
| View checklists | ✅ | ✅ | Team | Own |
| **Evaluations** |
| Create evaluation | ✅ | ❌ | ✅ (team) | ❌ |
| View evaluations | ✅ | ✅ | Team | Own |
| **Quality Control** |
| Create QC | ✅ | ❌ | ✅ | ❌ |
| View QC | ✅ | ✅ | Team | Own |
| **KPI** |
| Configure KPI | ✅ | ❌ | ❌ | ❌ |
| View all KPI | ✅ | ✅ | Team | Own |
| **Dashboard** |
| Executive dashboard | ✅ | ✅ | ❌ | ❌ |
| Supervisor dashboard | ✅ | ❌ | ✅ | ❌ |
| Employee dashboard | ✅ | ❌ | ❌ | ✅ |
| **Reports** |
| All reports | ✅ | ✅ | Team scope | Own |
| Export | ✅ | ✅ | Team | Own |
| **Settings** |
| Manage settings | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs** |
| View audit logs | ✅ | ❌ | ❌ | ❌ |
| **Notifications** |
| View own | ✅ | ✅ | ✅ | ✅ |
| **Training** |
| Manage training | ✅ | ❌ | ✅ (team) | View own |
| **Critical Incidents** |
| Create/resolve | ✅ | ❌ | ✅ | ❌ |
| View | ✅ | ✅ | Team | Own |

## Data Scope Rules

### EMPLOYEE Scope
```sql
WHERE employeeId = currentUser.employeeProfileId
```

### SUPERVISOR Scope
```sql
WHERE employee.supervisorId = currentUser.employeeProfileId
   OR employeeId = currentUser.employeeProfileId
```

### CEO Scope
- Read-only access to all data
- No write operations except profile/password

### SUPER_ADMIN Scope
- Full access, no restrictions

## Implementation

- `@Roles()` decorator on controllers
- `RolesGuard` checks JWT role claims
- `DataScopeService` injects WHERE clauses per role
- Sensitive operations require `@RequirePermission()` decorator
