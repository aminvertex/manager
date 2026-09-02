# KPI Engine Architecture

## Overview

The KPI Engine calculates weighted performance scores for each employee per period (week/month). All weights and thresholds are **configurable** via database — never hard-coded.

## Default KPI Weights

| KPI Component | Persian Name | Weight |
|--------------|-------------|--------|
| `onTimeDelivery` | انجام به موقع Taskها | 20% |
| `scientificQuality` | کیفیت علمی | 20% |
| `accuracy` | دقت و خطای پایین | 15% |
| `documentation` | کیفیت گزارش و مستندسازی | 10% |
| `productivity` | بهره‌وری | 10% |
| `processCompliance` | رعایت فرآیندها و Checklist | 10% |
| `learning` | یادگیری و توسعه تخصصی | 5% |
| `teamwork` | همکاری تیمی | 5% |
| `responsibility` | مسئولیت‌پذیری | 5% |

**Total: 100%**

## Calculation Formula

```
weightedScore = Σ (componentScore × weight) / 100
```

Where each `componentScore` is 0-100.

### Component Score Sources

| Component | Data Source | Calculation |
|-----------|------------|-------------|
| onTimeDelivery | TaskAssignments | (onTimeCount / totalCompleted) × 100 |
| scientificQuality | SupervisorEvaluations | Average of criteria 1-3 × 20 |
| accuracy | QualityControl | 100 - (errorRate × penaltyFactor) |
| documentation | SupervisorEvaluations | Criteria 6-7 average × 20 |
| productivity | TaskAssignments | Normalized completion vs expected |
| processCompliance | DailyChecklists | Average completion % |
| learning | Training | (completedTrainings / assigned) × 100 |
| teamwork | Manual/Supervisor input | 0-100 |
| responsibility | Manual/Supervisor input | 0-100 |

## Critical Incident Penalty

```
finalScore = weightedScore - Σ(incidentPenalty × severityMultiplier)
```

Configurable via `KPIConfiguration`:
- `criticalIncidentPenalty`: base penalty points
- `severityMultipliers`: { LOW: 0.5, MEDIUM: 1.0, HIGH: 1.5, CRITICAL: 2.0 }

## Performance Classification

| Score Range | Label | Dashboard Color |
|------------|-------|----------------|
| 90-100 | ممتاز | 🟢 Green |
| 80-89 | بسیار خوب | 🟢 Green |
| 70-79 | قابل قبول | 🟡 Yellow |
| 60-69 | نیازمند بهبود | 🟡 Yellow |
| <60 | نیازمند مداخله مدیریتی | 🔴 Red |

Thresholds stored in `PerformanceClassification` settings.

## Important Rules

1. **Task count alone must NOT increase KPI** — Quality and timeliness matter
2. High task volume + low quality = low KPI
3. Many revisions = accuracy penalty
4. Many delays = onTimeDelivery penalty
5. Critical incidents can significantly reduce score
6. Recalculation triggered on: task approval, evaluation, QC, checklist, training completion

## Recalculation Triggers

- Task status → APPROVED
- SupervisorEvaluation created/updated
- QualityControl recorded
- DailyChecklist submitted
- WeeklyChecklist submitted
- Training completed
- CriticalIncident recorded/resolved
- Manual recalculate endpoint (Admin)

## Unit Test Example

```
Employee A scores:
  onTimeDelivery: 90
  scientificQuality: 85
  accuracy: 95
  documentation: 80
  productivity: 70
  processCompliance: 90
  learning: 80
  teamwork: 90
  responsibility: 95

Weighted = (90×20 + 85×20 + 95×15 + 80×10 + 70×10 + 90×10 + 80×5 + 90×5 + 95×5) / 100
         = (1800 + 1700 + 1425 + 800 + 700 + 900 + 400 + 450 + 475) / 100
         = 8650 / 100
         = 86.5

Classification: بسیار خوب (80-89)
```

## Database Tables

- `KPIConfiguration` — weights, thresholds, penalties
- `EmployeeKPI` — calculated scores per employee per period
- `PerformanceClassification` — score range → label mapping

## Phase 4 Implementation

KPI Engine will be implemented in Phase 4 with full unit tests.
