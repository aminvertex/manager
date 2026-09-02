import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { calculateKPI, computeOnTimeRate, computeAccuracy, computeProductivity } from '../common/kpi-engine';
import { DEFAULT_KPI_WEIGHTS } from '@amatis/shared';

@Injectable()
export class KpiService {
  private readonly logger = new Logger(KpiService.name);

  constructor(private prisma: PrismaService) {}

  private periodKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  async getWeights(): Promise<any> {
    const config = await this.prisma.kPIConfiguration.findUnique({ where: { key: 'kpi_weights' } });
    if (config) return config.value;
    const setting = await this.prisma.setting.findUnique({ where: { key: 'kpi_weights' } });
    return setting ? setting.value : DEFAULT_KPI_WEIGHTS;
  }

  async saveWeights(weights: Record<string, number>): Promise<any> {
    const validated: Record<string, number> = {};
    for (const [k, v] of Object.entries(weights)) {
      const num = Number(v);
      if (!Number.isNaN(num)) validated[k] = Math.max(0, Math.min(100, num));
    }
    await this.prisma.kPIConfiguration.upsert({
      where: { key: 'kpi_weights' },      create: { key: 'kpi_weights', value: validated },
      update: { value: validated },
    });
    return validated;
  }

  async getProjectWeights(projectId: string): Promise<any> {
    const config = await this.prisma.kPIConfiguration.findUnique({
      where: { key: `project_weights:${projectId}` },
    });
    if (config) return config.value;
    return this.getWeights();
  }

  async saveProjectWeights(projectId: string, weights: Record<string, number>): Promise<any> {
    const validated: Record<string, number> = {};
    for (const [k, v] of Object.entries(weights)) {
      const num = Number(v);
      if (!Number.isNaN(num)) validated[k] = Math.max(0, Math.min(100, num));
    }
    await this.prisma.kPIConfiguration.upsert({
      where: { key: `project_weights:${projectId}` },
      create: { key: `project_weights:${projectId}`, value: validated },
      update: { value: validated },
    });
    return validated;
  }

  async getProjectWeightSummary() {
    const configs = await this.prisma.kPIConfiguration.findMany({
      where: { key: { startsWith: 'project_weights:' } },
    });
    return configs.map((c) => ({ projectId: c.key.replace('project_weights:', ''), weights: c.value }));
  }

  async getTrend(employeeId: string, months = 6) {
    const now = new Date();
    const periods: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const kpis = await this.prisma.employeeKPI.findMany({
      where: { employeeId, period: { in: periods } },
      orderBy: { period: 'asc' },
      select: { period: true, finalScore: true, classification: true },
    });

    const evals = await this.prisma.performanceEvaluation.findMany({
      where: { employeeId, period: { in: periods } },
      select: { period: true, score: true, selfScore: true },
    });

    const map = new Map<string, any>();
    periods.forEach((p) => map.set(p, { period: p, kpi: null, supervisorScore: null, selfScore: null, teamAverage: null }));
    kpis.forEach((k) => { if (map.has(k.period)) map.get(k.period).kpi = k.finalScore; });
    evals.forEach((e) => {
      if (map.has(e.period)) {
        const entry = map.get(e.period);
        if (e.score != null) entry.supervisorScore = e.score;
        if (e.selfScore != null) entry.selfScore = e.selfScore;
      }
    });

    // team average per period (all employees' KPI for those periods)
    const teamKpis = await this.prisma.employeeKPI.findMany({
      where: { period: { in: periods } },
      select: { period: true, finalScore: true },
    });
    const teamAvg: Record<string, number[]> = {};
    teamKpis.forEach((k) => {
      if (!teamAvg[k.period]) teamAvg[k.period] = [];
      teamAvg[k.period].push(k.finalScore);
    });
    periods.forEach((p) => {
      const vals = teamAvg[p];
      if (vals && vals.length > 0) {
        map.get(p).teamAverage = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
      }
    });

    return Array.from(map.values());
  }

  async recalculateForEmployee(employeeId: string, period?: string): Promise<any> {
    const month = period || this.periodKey(new Date());
    const [startStr, endStr] = this.getMonthRange(month);

    // Gather data
    const tasks = await this.prisma.taskAssignment.findMany({
      where: { employeeId, deletedAt: null, createdAt: { gte: startStr, lte: endStr } },
    });

    const evaluations = await this.prisma.supervisorEvaluation.findMany({
      where: { employeeId, evaluatedAt: { gte: startStr, lte: endStr } },
    });

    const qualityControls = await this.prisma.qualityControl.findMany({
      where: { employeeId, createdAt: { gte: startStr, lte: endStr } },
    });

    const checklists = await this.prisma.dailyChecklist.findMany({
      where: { employeeId, date: { gte: startStr, lte: endStr } },
    });

    const trainings = await this.prisma.training.findMany({
      where: { employeeId, updatedAt: { gte: startStr, lte: endStr } },
    });

    const criticalIncidents = await this.prisma.criticalIncident.findMany({
      where: { employeeId, incidentDate: { gte: startStr, lte: endStr } },
    });

    // ---- Component scores ----
    const onTimeDelivery = computeOnTimeRate(tasks);

    const evalScores = evaluations.map(e => e.score100 ?? 0).filter(v => v > 0);
    const scientificQuality = evalScores.length ? Math.round(evalScores.reduce((s, v) => s + v, 0) / evalScores.length) : 0;

    const errorRate = qualityControls.filter(q => q.scientificError || q.calculationError || q.interpretationError).length;
    const accuracy = computeAccuracy(qualityControls.map(() => ({ errorCount: 1 })), Math.max(1, tasks.filter(t => t.status === 'APPROVED').length || 1));

    const docScores = evaluations.map(e => {
      const sc = e.scores as Record<string, number>;
      const writing = sc?.writing_quality ?? 0;
      const doc = sc?.documentation ?? 0;
      return writing && doc ? ((writing + doc) / 2) * 20 : 0;
    }).filter(v => v > 0);
    const documentation = docScores.length ? Math.round(docScores.reduce((s, v) => s + v, 0) / docScores.length) : 0;

    const completedCount = tasks.filter(t => t.status === 'APPROVED').length;
    const expected = Math.max(8, Math.round(tasks.length * 0.7));
    const productivity = computeProductivity(completedCount, expected);

    const checklistCompletion = checklists.length ? Math.round(checklists.reduce((s, c) => s + c.completionRate, 0) / checklists.length) : 0;
    const processCompliance = checklistCompletion;

    const completedTrainings = trainings.filter(t => t.status === 'COMPLETED').length;
    const learning = trainings.length ? Math.min(100, Math.round((completedTrainings / Math.max(1, trainings.length)) * 100)) : 0;

    const teamworkScore = evalScores.length ? scientificQuality : 70;
    const responsibilityScore = evalScores.length ? scientificQuality : 70;

    const scores: Record<string, number> = {
      onTimeDelivery,
      scientificQuality,
      accuracy,
      documentation,
      productivity,
      processCompliance,
      learning,
      teamwork: teamworkScore,
      responsibility: responsibilityScore,
    };

    // Penalty from critical incidents
    const penaltyConfig = await this.prisma.kPIConfiguration.findUnique({ where: { key: 'critical_incident_penalty' } });
    let penalty = 0;
    if (penaltyConfig) {
      const cfg = penaltyConfig.value as any;
      for (const incident of criticalIncidents) {
        const mult = cfg.severityMultipliers?.[incident.severity] ?? 1;
        penalty += (cfg.basePenalty ?? 10) * mult;
      }
    } else {
      penalty = criticalIncidents.length * 10;
    }

    // Use project-specific weights if the employee's primary project has custom weights
    let weights = await this.getWeights();
    const emp = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      select: { primaryProjectId: true },
    });
    if (emp?.primaryProjectId) {
      const projectWeights = await this.getProjectWeights(emp.primaryProjectId);
      if (projectWeights && Object.keys(projectWeights).length > 0) {
        weights = projectWeights;
      }
    }
    const result = calculateKPI(scores, weights as any, penalty);

    const kpi = await this.prisma.employeeKPI.upsert({
      where: { employeeId_period_periodType: { employeeId, period: month, periodType: 'MONTHLY' } },
      create: {
        employeeId, period: month, periodType: 'MONTHLY',
        scores: scores as any,
        weightedScore: result.weightedScore,
        classification: result.classification,
        penalty: result.penalty,
        finalScore: result.finalScore,
      },
      update: {
        scores: scores as any,
        weightedScore: result.weightedScore,
        classification: result.classification,
        penalty: result.penalty,
        finalScore: result.finalScore,
      },
    });

    this.logger.log(`KPI recalculated for employee ${employeeId} (${month}): ${result.finalScore} ${result.classification}`);
    return { ...kpi, scores, finalScore: result.finalScore, classification: result.classification };
  }

  async recalculateAll(period?: string) {
    const employees = await this.prisma.employeeProfile.findMany({ where: { deletedAt: null } });
    const results = [];
    for (const emp of employees) {
      results.push(await this.recalculateForEmployee(emp.id, period));
    }
    return { count: results.length, results };
  }

  private getMonthRange(month: string): [Date, Date] {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    return [start, end];
  }

  async getRanking(period?: string) {
    const month = period || this.periodKey(new Date());
    const kpis = await this.prisma.employeeKPI.findMany({
      where: { period: month, periodType: 'MONTHLY' },
      orderBy: { finalScore: 'desc' },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true, position: true, avatarUrl: true },
        },
      },
    });
    return kpis.map((k, i) => ({
      rank: i + 1,
      employee: k.employee,
      score: k.finalScore,
      classification: k.classification,
      weightedScore: k.weightedScore,
      penalty: k.penalty,
    }));
  }
}
