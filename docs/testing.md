# Testing Strategy

## Test Levels

### Unit Tests
- KPI calculation engine (weighted scores, penalties)
- Delay calculation logic
- Checklist completion percentage
- Data scope filtering
- Password hashing/validation
- DTO validation

### Integration Tests
- Authentication flow (login, refresh, logout)
- Authorization (role guards, data scope)
- Employee CRUD with user creation
- Project CRUD
- Settings management
- Audit log creation

### E2E Tests (Acceptance)
Full acceptance test scenario (30 steps) as defined in requirements.

## Phase 1 Tests

```
apps/api/
├── src/
│   ├── auth/
│   │   └── auth.service.spec.ts
│   ├── employees/
│   │   └── employees.service.spec.ts
│   └── common/
│       └── guards/
│           └── roles.guard.spec.ts
└── test/
    ├── auth.e2e-spec.ts
    └── employees.e2e-spec.ts
```

## Running Tests

```bash
# Unit tests
npm run test --workspace=@amatis/api

# E2E tests
npm run test:e2e --workspace=@amatis/api

# Coverage
npm run test:cov --workspace=@amatis/api
```

## KPI Unit Test (Phase 4)

```typescript
describe('KPI Engine', () => {
  it('should calculate weighted score correctly', () => {
    const scores = {
      onTimeDelivery: 90,
      scientificQuality: 85,
      accuracy: 95,
      documentation: 80,
      productivity: 70,
      processCompliance: 90,
      learning: 80,
      teamwork: 90,
      responsibility: 95,
    };
    const result = kpiEngine.calculate(scores, defaultWeights);
    expect(result.weightedScore).toBe(86.5);
    expect(result.classification).toBe('بسیار خوب');
  });

  it('should apply critical incident penalty', () => {
    const result = kpiEngine.calculate(scores, weights, {
      criticalIncidents: [{ severity: 'HIGH', penalty: 10 }],
    });
    expect(result.finalScore).toBeLessThan(86.5);
  });

  it('should not reward high task count with low quality', () => {
    const highVolumeLowQuality = { ...scores, scientificQuality: 30, accuracy: 20 };
    const result = kpiEngine.calculate(highVolumeLowQuality, defaultWeights);
    expect(result.weightedScore).toBeLessThan(60);
  });
});
```

## Test Data

Seed script provides demo accounts and sample data for development testing.
See `.env.example` for demo credentials.
