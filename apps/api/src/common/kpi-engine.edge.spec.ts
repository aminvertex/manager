import { classifyPerformance, computeOnTimeRate, computeAccuracy, computeProductivity } from './kpi-engine';

describe('Performance Classification Thresholds', () => {
  it('should classify high scores as excellent', () => {
    expect(classifyPerformance(95)?.label).toBeDefined();
    expect(classifyPerformance(95)?.color).toBe('green');
  });

  it('should classify mid scores as needs improvement (yellow)', () => {
    const result = classifyPerformance(65);
    expect(result?.color).toBe('yellow');
  });

  it('should classify low scores as needs intervention (red)', () => {
    const result = classifyPerformance(30);
    expect(result?.color).toBe('red');
  });

  it('should handle boundary exactly at 90', () => {
    const result = classifyPerformance(90);
    expect(result?.color).toBe('green');
  });

  it('should handle boundary exactly at 60', () => {
    const result = classifyPerformance(60);
    expect(result?.color).toBe('yellow');
  });
});

describe('On-Time Rate', () => {
  it('should return 100 when all tasks are on time', () => {
    const tasks = [
      { deadline: new Date('2026-01-01'), completionTime: new Date('2026-01-01'), status: 'APPROVED' },
      { deadline: new Date('2026-01-02'), completionTime: new Date('2026-01-02'), status: 'APPROVED' },
    ];
    expect(computeOnTimeRate(tasks as any)).toBe(100);
  });

  it('should return 0 for empty tasks', () => {
    expect(computeOnTimeRate([])).toBe(0);
  });
});

describe('Accuracy', () => {
  it('should return 100 when no errors', () => {
    expect(computeAccuracy([], 10)).toBe(100);
  });

  it('should reduce with errors', () => {
    const errors = [{ errorCount: 1 }, { errorCount: 0 }];
    const result = computeAccuracy(errors as any, 10);
    expect(result).toBeLessThan(100);
  });
});

describe('Productivity', () => {
  it('should return 100 when completed equals expected', () => {
    expect(computeProductivity(10, 10)).toBe(100);
  });

  it('should be 0 when nothing completed', () => {
    expect(computeProductivity(0, 10)).toBe(0);
  });
});
