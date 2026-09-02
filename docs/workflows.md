# Workflows

## Task Workflow

### Primary Flow

```
ASSIGNED → NOT_STARTED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED
```

### Revision Flow

```
UNDER_REVIEW → NEED_REVISION → IN_PROGRESS → RESUBMITTED → UNDER_REVIEW → APPROVED
```

### Rejection Flow

```
UNDER_REVIEW → REJECTED
```

### Cancellation

```
Any active status → CANCELLED
```

## Status Mapping

| Backend Status | UI Label (Persian) | Description |
|---------------|-------------------|-------------|
| ASSIGNED | اختصاص یافته | Task assigned to employee |
| NOT_STARTED | شروع نشده | Employee hasn't started |
| IN_PROGRESS | در حال انجام | Employee working on it |
| SUBMITTED | ارسال شده | Employee submitted output |
| UNDER_REVIEW | در حال بررسی | Supervisor reviewing |
| NEED_REVISION | نیازمند اصلاح | Supervisor requested changes |
| RESUBMITTED | ارسال مجدد | Employee resubmitted after revision |
| APPROVED | تأیید شده | Supervisor approved |
| REJECTED | رد شده | Supervisor rejected |
| CANCELLED | لغو شده | Task cancelled |
| DELAYED | عقب‌افتاده | Auto-calculated: past deadline, not completed |

## Delay Calculation

```
IF currentDate > deadline AND status NOT IN (APPROVED, CANCELLED):
  → isDelayed = true
  → delayDays = currentDate - deadline

IF completedAt > deadline:
  → isLateDelivery = true
  → lateDeliveryDays = completedAt - deadline
```

Both fields are **system-calculated** — users cannot manually set them.

## Revision Workflow

1. Supervisor sets status to NEED_REVISION with reason + comment + due date
2. System creates TaskRevision record (auto-increments revisionNumber)
3. Employee receives notification
4. Employee works on revision, uploads new file (new version)
5. Employee resubmits → status RESUBMITTED
6. Supervisor reviews again

Each revision tracks:
- revisionNumber (auto)
- requestedBy, requestedAt
- reason, comment
- dueDate
- submittedAt, resolvedAt
- status (PENDING, IN_PROGRESS, SUBMITTED, RESOLVED)

## Supervisor Evaluation Workflow

1. Task reaches UNDER_REVIEW
2. Supervisor opens evaluation form
3. Scores 10 criteria (1-5 each)
4. System calculates: average / 5 × 100 = score100
5. Supervisor chooses action:
   - Approve → APPROVED
   - Approve with Comment → APPROVED (with note)
   - Need Revision → NEED_REVISION
   - Reject → REJECTED

## Authentication Workflow

```
Login (mobile + password)
  ↓
IF mustChangePassword → redirect to /change-password
  ↓
IF valid → issue accessToken + refreshToken
  ↓
Store refreshToken in DB (hashed)
  ↓
Return tokens + user info
```

## Password Change Workflow

```
First login with initial password
  ↓
System detects mustChangePassword = true
  ↓
Force redirect to change password page
  ↓
User sets new password
  ↓
mustChangePassword = false
  ↓
Redirect to dashboard
```

## Checklist Workflow

### Daily
- Employee completes daily checklist each workday
- Each item: YES / NO / N/A
- Completion % = applicable YES / applicable total (N/A excluded from denominator)
- Missing daily checklist triggers reminder at 09:00

### Weekly
- Employee completes at end of week (Friday)
- Includes performance self-assessment fields
- Missing weekly checklist triggers reminder

## Notification Triggers

| Event | Recipient | Timing |
|-------|-----------|--------|
| Task assigned | Employee | Immediate |
| Deadline -24h | Employee | Cron |
| Deadline -2h | Employee | Cron |
| Task delayed | Employee + Supervisor | Cron (after deadline) |
| Need revision | Employee | Immediate |
| Task approved | Employee | Immediate |
| Checklist reminder | Employee | Daily 09:00 |
| Weekly review reminder | Employee | Friday 16:00 |

## Phase 2+ Implementation

Full workflow implementation in Phase 2 (tasks) and Phase 5 (notifications).
