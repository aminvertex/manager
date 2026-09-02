import { RoleCode } from '@amatis/types';
import { DEFAULT_KPI_WEIGHTS, DEFAULT_PERFORMANCE_CLASSIFICATIONS } from '@amatis/shared';
import {
  calculateKPI,
  classifyPerformance,
  computeOnTimeRate,
  computeAccuracy,
  computeProductivity,
} from './kpi-engine';

describe('KPI Engine (Unit)', () => {
  it('should calculate weighted score correctly for Employee A (exact expected value)', () => {
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

    // Expected: (90×20 + 85×20 + 95×15 + 80×10 + 70×10 + 90×10 + 80×5 + 90×5 + 95×5) / 100 = 86.5
    const result = calculateKPI(scores);
    expect(result.weightedScore).toBe(86.5);
    expect(result.finalScore).toBe(86.5);
    expect(result.classification).toBe('بسیار خوب');
    expect(result.penalty).toBe(0);
  });

  it('should not reward high task volume with low quality', () => {
    const highVolumeLowQuality = {
      onTimeDelivery: 90,
      scientificQuality: 30,
      accuracy: 20,
      documentation: 40,
      productivity: 95,
      processCompliance: 50,
      learning: 60,
      teamwork: 70,
      responsibility: 80,
    };

    const result = calculateKPI(highVolumeLowQuality);
    expect(result.finalScore).toBeLessThan(60);
    expect(result.classification).toBe('نیازمند مداخله مدیریتی');
  });

  it('should classify excellent performance correctly', () => {
    const excellentScores = {
      onTimeDelivery: 95,
      scientificQuality: 92,
      accuracy: 98,
      documentation: 90,
      productivity: 88,
      processCompliance: 95,
      learning: 85,
      teamwork: 90,
      responsibility: 96,
    };

    const result = calculateKPI(excellentScores);
    expect(result.finalScore).toBeGreaterThanOrEqual(90);
    expect(result.classification).toBe('ممتاز');
  });

  it('should apply weights correctly - onTimeDelivery has 20% weight', () => {
    const onlyOnTime = {
      onTimeDelivery: 100,
      scientificQuality: 0,
      accuracy: 0,
      documentation: 0,
      productivity: 0,
      processCompliance: 0,
      learning: 0,
      teamwork: 0,
      responsibility: 0,
    };

    expect(calculateKPI(onlyOnTime).finalScore).toBe(20);
  });

  it('should apply critical incident penalty', () => {
    const good = {
      onTimeDelivery: 90, scientificQuality: 90, accuracy: 90, documentation: 90,
      productivity: 90, processCompliance: 90, learning: 90, teamwork: 90, responsibility: 90,
    };
    const before = calculateKPI(good);
    const after = calculateKPI(good, DEFAULT_KPI_WEIGHTS, 15);
    expect(after.finalScore).toBe(before.finalScore - 15);
  });

  it('should clamp finalScore to minimum 0', () => {
    const poor = {
      onTimeDelivery: 0, scientificQuality: 0, accuracy: 0, documentation: 0,
      productivity: 0, processCompliance: 0, learning: 0, teamwork: 0, responsibility: 0,
    };
    expect(calculateKPI(poor, DEFAULT_KPI_WEIGHTS, 30).finalScore).toBe(0);
  });

  it('computeOnTimeRate should calculate correctly', () => {
    const tasks = [
      { deadline: new Date('2026-08-01'), completionTime: new Date('2026-07-30'), status: 'APPROVED' },
      { deadline: new Date('2026-08-01'), completionTime: new Date('2026-08-02'), status: 'APPROVED' },
      { deadline: new Date('2026-08-01'), completionTime: new Date('2026-07-29'), status: 'APPROVED' },
      { deadline: null, completionTime: new Date('2026-08-03'), status: 'APPROVED' },
      { deadline: new Date('2026-08-01'), completionTime: null, status: 'IN_PROGRESS' },
    ];
    // 4 completed, 3 on time (1 no deadline = on time) → 75
    expect(computeOnTimeRate(tasks)).toBe(75);
  });

  it('computeAccuracy should penalize errors', () => {
    expect(computeAccuracy([{ errorCount: 1 }, { errorCount: 0 }], 2)).toBe(50);
    expect(computeAccuracy([], 0)).toBe(100);
  });

  it('computeProductivity should cap at 100', () => {
    expect(computeProductivity(8, 8)).toBe(100);
    expect(computeProductivity(10, 8)).toBe(100);
    expect(computeProductivity(4, 8)).toBe(50);
  });
});

describe('RoleCode enum', () => {
  it('should have all required roles', () => {
    expect(RoleCode.SUPER_ADMIN).toBe('SUPER_ADMIN');
    expect(RoleCode.CEO).toBe('CEO');
    expect(RoleCode.SUPERVISOR).toBe('SUPERVISOR');
    expect(RoleCode.EMPLOYEE).toBe('EMPLOYEE');
  });
});

describe('Performance Classifications', () => {
  it('should have 5 classification levels', () => {
    expect(DEFAULT_PERFORMANCE_CLASSIFICATIONS).toHaveLength(5);
  });

  it('should cover full score range 0-100', () => {
    const minScore = Math.min(...DEFAULT_PERFORMANCE_CLASSIFICATIONS.map((c) => c.minScore));
    const maxScore = Math.max(...DEFAULT_PERFORMANCE_CLASSIFICATIONS.map((c) => c.maxScore));
    expect(minScore).toBe(0);
    expect(maxScore).toBe(100);
  });

  it('classifyPerformance should return correct labels', () => {
    expect(classifyPerformance(95).label).toBe('ممتاز');
    expect(classifyPerformance(85).label).toBe('بسیار خوب');
    expect(classifyPerformance(75).label).toBe('قابل قبول');
    expect(classifyPerformance(65).label).toBe('نیازمند بهبود');
    expect(classifyPerformance(40).label).toBe('نیازمند مداخله مدیریتی');
  });
});
