import { KPIWeights } from '@amatis/types';
import { DEFAULT_KPI_WEIGHTS, DEFAULT_PERFORMANCE_CLASSIFICATIONS } from '@amatis/shared';

export interface KPIComponentScores {
  onTimeDelivery: number;
  scientificQuality: number;
  accuracy: number;
  documentation: number;
  productivity: number;
  processCompliance: number;
  learning: number;
  teamwork: number;
  responsibility: number;
}

export interface KPIResult {
  weightedScore: number;
  penalty: number;
  finalScore: number;
  classification: string;
  classificationColor: string;
}

export function calculateKPI(
  scores: Record<string, number>,
  weights: KPIWeights = DEFAULT_KPI_WEIGHTS,
  penalty: number = 0,
): KPIResult {
  let total = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += (scores[key] || 0) * (weight as number);
  }
  const weightedScore = total / 100;
  const finalScore = Math.max(0, Math.round((weightedScore - penalty) * 10) / 10);
  const classification = classifyPerformance(finalScore);
  return { weightedScore, penalty, finalScore, classification: classification.label, classificationColor: classification.color };
}

export function classifyPerformance(score: number): { label: string; color: string } {
  for (const c of DEFAULT_PERFORMANCE_CLASSIFICATIONS) {
    if (score >= c.minScore && score <= c.maxScore) {
      return { label: c.label, color: c.color };
    }
  }
  return { label: 'نامشخص', color: 'gray' };
}

export function computeOnTimeRate(tasks: { deadline: Date | null; completionTime: Date | null; status: string }[]): number {
  const completed = tasks.filter(t => t.status === 'APPROVED' && t.completionTime);
  if (completed.length === 0) return 0;
  const onTime = completed.filter(t => {
    if (!t.deadline) return true;
    return t.completionTime! <= t.deadline;
  }).length;
  return Math.round((onTime / completed.length) * 100);
}

export function computeAccuracy(errors: { errorCount: number }[], totalTasks: number): number {
  if (totalTasks === 0) return 100;
  const totalErrors = errors.reduce((s, e) => s + e.errorCount, 0);
  return Math.max(0, Math.round((1 - totalErrors / totalTasks) * 100));
}

export function computeProductivity(completed: number, expected: number): number {
  if (expected === 0) return 0;
  return Math.min(100, Math.round((completed / expected) * 100));
}
