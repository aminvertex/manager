import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { computeOnTimeRate } from '../common/kpi-engine';
import { KpiService } from '../kpi/kpi.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  constructor(private prisma: PrismaService, private kpi: KpiService) {}

  private monthRange(period?: string): [Date, Date] {
    if (period) {
      const [y, m] = period.split('-').map(Number);
      return [new Date(Date.UTC(y, m - 1, 1)), new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))];
    }
    const now = new Date();
    return [new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)), new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))];
  }

  private employeeScope(where: any, user: JwtPayload) {
    if (user.roles.includes('EMPLOYEE')) {
      where.employeeId = user.employeeProfileId;
    } else if (user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO') && !user.roles.includes('SUPER_ADMIN')) {
      return where; // supervisor filter handled by team in caller
    }
    return where;
  }

  async getExecutive(user: JwtPayload, query: any) {
    const [start, end] = this.monthRange(query.period);
    const taskWhere: any = { deletedAt: null, createdAt: { gte: start, lte: end } };

    // role-scoped employee list
    let empFilter = {};
    if (user.roles.includes('EMPLOYEE')) empFilter = { id: user.employeeProfileId };
    else if (user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO') && !user.roles.includes('SUPER_ADMIN')) {
      const subs = await this.prisma.employeeProfile.findMany({ where: { supervisorId: user.employeeProfileId }, select: { id: true } });
      empFilter = { id: { in: subs.map(s => s.id) } };
    }
    if (query.employeeId) empFilter = { id: query.employeeId };
    if (query.supervisorId) empFilter = { supervisorId: query.supervisorId };
    taskWhere.employee = empFilter;
    if (query.projectId) taskWhere.projectId = query.projectId;
    if (query.status) taskWhere.status = query.status;

    const [employees, tasks, completedTasks, delayedTasks, needRevisionTasks, checklists, qcs, trainings, kpis] = await Promise.all([
      this.prisma.employeeProfile.findMany({ where: { ...empFilter, deletedAt: null } }),
      this.prisma.taskAssignment.findMany({ where: taskWhere }),
      this.prisma.taskAssignment.count({ where: { ...taskWhere, status: 'APPROVED' } }),
      this.prisma.taskAssignment.findMany({ where: { ...taskWhere, status: { notIn: ['APPROVED', 'CANCELLED'] } } }),
      this.prisma.taskAssignment.count({ where: { ...taskWhere, status: 'NEED_REVISION' } }),
      this.prisma.dailyChecklist.findMany({ where: { employee: empFilter, date: { gte: start, lte: end } } }),
      this.prisma.qualityControl.findMany({ where: { employee: empFilter, createdAt: { gte: start, lte: end } } }),
      this.prisma.training.findMany({ where: { employee: empFilter, createdAt: { gte: start, lte: end } } }),
      this.prisma.employeeKPI.findMany({ where: { employee: empFilter, period: query.period || this.periodKey(new Date()), periodType: 'MONTHLY' } }),
    ]);

    const delayedCount = delayedTasks.filter(t => {
      if (['APPROVED', 'CANCELLED'].includes(t.status)) return false;
      if (t.isDelayed) return true;
      return t.deadline && new Date() > t.deadline;
    }).length;

    const totalTasks = tasks.length;
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const onTimeRate = computeOnTimeRate(tasks);
    const avgQuality = qcs.length ? Math.round(qcs.reduce((s, q) => s + (q.qualityScore || 0), 0) / qcs.length) : null;
    const avgKpi = kpis.length ? Math.round((kpis.reduce((s, k) => s + k.finalScore, 0) / kpis.length) * 10) / 10 : null;
    const checklistCompletion = checklists.length ? Math.round(checklists.reduce((s, c) => s + c.completionRate, 0) / checklists.length) : 0;
    const trainingSessions = trainings.filter(t => t.status === 'COMPLETED').length;
    const errorCount = qcs.filter(q => q.scientificError || q.calculationError || q.interpretationError).length;
    const avgCaseDuration = await this.getAvgCaseDuration(empFilter, start, end);

    return {
      period: query.period || this.periodKey(new Date()),
      cards: {
        totalEmployees: employees.length,
        totalTasks,
        completedTasks,
        completionRate,
        onTimeRate,
        delayedTasks: delayedCount,
        needRevisionTasks,
        averageQuality: avgQuality,
        averagePerformance: avgKpi,
        dailyChecklistCompletion: checklistCompletion,
        numberOfCases: await this.prisma.psychometricCase.count({ where: { employee: empFilter, createdAt: { gte: start, lte: end } } }),
        averageCaseDuration: avgCaseDuration,
        numberOfErrors: errorCount,
        trainingSessions,
      },
    };
  }

  async getCharts(user: JwtPayload, query: any) {
    const [start, end] = this.monthRange(query.period);
    let empFilter: any = {};
    if (user.roles.includes('EMPLOYEE')) empFilter = { id: user.employeeProfileId };
    else if (user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO') && !user.roles.includes('SUPER_ADMIN')) {
      const subs = await this.prisma.employeeProfile.findMany({ where: { supervisorId: user.employeeProfileId }, select: { id: true } });
      empFilter = { id: { in: subs.map(s => s.id) } };
    }
    if (query.employeeId) empFilter = { id: query.employeeId };

    const tasks = await this.prisma.taskAssignment.findMany({
      where: { deletedAt: null, createdAt: { gte: start, lte: end }, employee: empFilter, ...(query.projectId ? { projectId: query.projectId } : {}) },
      include: { employee: { select: { id: true, firstName: true, lastName: true } }, project: { select: { id: true, name: true } } },
    });

    const qcs = await this.prisma.qualityControl.findMany({ where: { employee: empFilter, createdAt: { gte: start, lte: end } }, include: { employee: { select: { id: true, firstName: true, lastName: true } } } });

    // Chart 1: employee performance comparison
    const perfByEmployee: Record<string, { name: string; tasks: number; completed: number; quality: number | null }> = {};
    for (const t of tasks) {
      const key = t.employeeId;
      if (!perfByEmployee[key]) perfByEmployee[key] = { name: `${t.employee.firstName} ${t.employee.lastName}`, tasks: 0, completed: 0, quality: null };
      perfByEmployee[key].tasks++;
      if (t.status === 'APPROVED') perfByEmployee[key].completed++;
    }
    for (const q of qcs) {
      const key = q.employeeId;
      if (perfByEmployee[key]) {
        const qsum = perfByEmployee[key].quality ?? 0;
        perfByEmployee[key].quality = (qsum + (q.qualityScore || 0)) / 2;
      }
    }

    // Chart 2: weekly trend (4 weeks)
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const wStart = new Date(start); wStart.setDate(wStart.getDate() + i * 7);
      const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
      const weekTasks = tasks.filter(t => { const d = new Date(t.createdAt); return d >= wStart && d <= wEnd; });
      const completed = weekTasks.filter(t => t.status === 'APPROVED').length;
      return { week: `هفته ${i + 1}`, completed, total: weekTasks.length, onTime: computeOnTimeRate(weekTasks) };
    });

    // Chart 3: task status distribution
    const statusCounts: Record<string, number> = {};
    for (const t of tasks) statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;

    // Chart 5: project performance
    const projectPerf: Record<string, { name: string; tasks: number; completed: number; quality: number | null }> = {};
    for (const t of tasks) {
      const key = t.projectId || 'none';
      if (!projectPerf[key]) projectPerf[key] = { name: t.project?.name || 'بدون پروژه', tasks: 0, completed: 0, quality: null };
      projectPerf[key].tasks++;
      if (t.status === 'APPROVED') projectPerf[key].completed++;
    }

    // Chart 7: revision rate
    const totalCompleted = tasks.filter(t => t.status === 'APPROVED').length;
    const totalRevisions = tasks.reduce((s, t) => s + t.revisionCount, 0);
    const revisionRate = totalCompleted ? Math.round((totalRevisions / Math.max(1, totalCompleted)) * 100) : 0;

    // Chart 8: monthly trend (last 6 months KPI)
    const kpiTrend = await this.prisma.employeeKPI.findMany({ where: { employee: empFilter, periodType: 'MONTHLY' }, orderBy: { period: 'desc' }, take: 6 });

    // Chart 9: KPI status distribution
    const kpiStatus = { green: 0, yellow: 0, red: 0 };
    const kpiRows = await this.prisma.employeeKPI.findMany({ where: { employee: empFilter, period: query.period || this.periodKey(new Date()), periodType: 'MONTHLY' } });
    for (const k of kpiRows) {
      if (k.finalScore >= 80) kpiStatus.green++;
      else if (k.finalScore >= 60) kpiStatus.yellow++;
      else kpiStatus.red++;
    }

    return {
      employeeComparison: Object.entries(perfByEmployee).map(([id, v]) => ({ id, ...v })),
      weeklyTrend: weeks,
      taskStatus: statusCounts,
      qualityComparison: Object.entries(perfByEmployee).map(([id, v]) => ({ id, name: v.name, quality: v.quality })),
      projectPerformance: Object.entries(projectPerf).map(([id, v]) => ({ id, ...v })),
      employeeProductivity: Object.entries(perfByEmployee).map(([id, v]) => ({ id, name: v.name, completed: v.completed })),
      revisionRate,
      totalRevisions,
      monthlyTrend: kpiTrend.reverse(),
      kpiStatus,
    };
  }

  async getSupervisor(user: JwtPayload, query: any) {
    const subs = await this.prisma.employeeProfile.findMany({ where: { supervisorId: user.employeeProfileId, deletedAt: null } });
    const ids = subs.map(s => s.id);
    const [start, end] = this.monthRange(query.period);
    const tasks = await this.prisma.taskAssignment.findMany({ where: { employeeId: { in: ids }, deletedAt: null, createdAt: { gte: start, lte: end } } });
    const pendingReviews = tasks.filter(t => t.status === 'SUBMITTED' || t.status === 'UNDER_REVIEW').length;
    const needRevision = tasks.filter(t => t.status === 'NEED_REVISION').length;
    const delayed = tasks.filter(t => t.isDelayed && !['APPROVED','CANCELLED'].includes(t.status)).length;
    const teamKpi = await this.prisma.employeeKPI.findMany({ where: { employeeId: { in: ids }, period: query.period || this.periodKey(new Date()), periodType: 'MONTHLY' } });
    const avgKpi = teamKpi.length ? Math.round(teamKpi.reduce((s, k) => s + k.finalScore, 0) / teamKpi.length * 10) / 10 : null;

    return {
      teamSize: subs.length,
      pendingReviews,
      needRevision,
      delayedTasks: delayed,
      teamKpi: avgKpi,
      teamQuality: await this.getAvgTeamQuality(ids, start, end),
      employees: subs.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName })),
    };
  }

  private async getAvgTeamQuality(ids: string[], start: Date, end: Date): Promise<number | null> {
    const qcs = await this.prisma.qualityControl.findMany({ where: { employeeId: { in: ids }, createdAt: { gte: start, lte: end } } });
    return qcs.length ? Math.round(qcs.reduce((s, q) => s + (q.qualityScore || 0), 0) / qcs.length) : null;
  }

  private async getAvgCaseDuration(empFilter: any, start: Date, end: Date): Promise<number | null> {
    const cases = await this.prisma.psychometricCase.findMany({ where: { employee: empFilter, createdAt: { gte: start, lte: end }, totalDurationMinutes: { not: null } } });
    return cases.length ? Math.round(cases.reduce((s, c) => s + (c.totalDurationMinutes || 0), 0) / cases.length) : null;
  }

  async getPeriodComparison(user: JwtPayload, query: any) {
    const currentPeriod = query.period || this.periodKey(new Date());
    const [y, m] = currentPeriod.split('-').map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const prevPeriod = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;

    const current = await this.getExecutive(user, { ...query, period: currentPeriod });
    const previous = await this.getExecutive(user, { ...query, period: prevPeriod });

    const delta = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

    return {
      currentPeriod,
      previousPeriod: prevPeriod,
      cards: {
        totalTasks: { current: current.cards.totalTasks, previous: previous.cards.totalTasks, delta: delta(current.cards.totalTasks, previous.cards.totalTasks) },
        completedTasks: { current: current.cards.completedTasks, previous: previous.cards.completedTasks, delta: delta(current.cards.completedTasks, previous.cards.completedTasks) },
        completionRate: { current: current.cards.completionRate, previous: previous.cards.completionRate, delta: current.cards.completionRate - previous.cards.completionRate },
        delayedTasks: { current: current.cards.delayedTasks, previous: previous.cards.delayedTasks, delta: delta(current.cards.delayedTasks, previous.cards.delayedTasks) },
        averageQuality: { current: current.cards.averageQuality, previous: previous.cards.averageQuality },
        averagePerformance: { current: current.cards.averagePerformance, previous: previous.cards.averagePerformance },
      },
    };
  }

  // Phase 43: Evaluation data-flow overview for an employee
  async getEvaluationDataFlow(user: JwtPayload, employeeId: string, period?: string) {
    const month = period || this.periodKey(new Date());
    const [start, end] = this.monthRange(month);

    const tasks = await this.prisma.taskAssignment.findMany({
      where: { employeeId, deletedAt: null, createdAt: { gte: start, lte: end } },
      select: { status: true, qualityScore: true, revisionCount: true, deadline: true },
    });
    const checklists = await this.prisma.dailyChecklist.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
      select: { completionRate: true },
    });
    const evaluations = await this.prisma.supervisorEvaluation.findMany({
      where: { employeeId, evaluatedAt: { gte: start, lte: end } },
      include: { supervisor: { select: { firstName: true, lastName: true } } },
    });
    const kpi = await this.prisma.employeeKPI.findFirst({
      where: { employeeId, period: month, periodType: 'MONTHLY' },
    });
    const perfEval = await this.prisma.performanceEvaluation.findFirst({
      where: { employeeId, period: month },
    });

    const completed = tasks.filter((t) => t.status === 'APPROVED').length;
    const quality = tasks.map((t) => t.qualityScore).filter((q): q is number => q != null);
    const checklistCompletion = checklists.length
      ? Math.round(checklists.reduce((s, c) => s + c.completionRate, 0) / checklists.length)
      : null;
    const evalScores = evaluations.map((e) => e.score100).filter((s): s is number => s != null);
    const avgEvalScore = evalScores.length ? Math.round(evalScores.reduce((s, v) => s + v, 0) / evalScores.length) : null;

    return {
      period: month,
      flow: {
        taskData: { totalTasks: tasks.length, completed, avgQuality: quality.length ? Math.round(quality.reduce((s, q) => s + q, 0) / quality.length) : null },
        checklist: { completionRate: checklistCompletion },
        performanceMetrics: { kpiScore: kpi?.finalScore ?? null, kpiClassification: kpi?.classification ?? null },
        supervisorEvaluation: {
          count: evaluations.length,
          avgScore: avgEvalScore,
          latest: evaluations.length ? {
            result: evaluations[evaluations.length - 1].result,
            comment: evaluations[evaluations.length - 1].comment,
            supervisor: evaluations[evaluations.length - 1].supervisor,
            evaluatedAt: evaluations[evaluations.length - 1].evaluatedAt,
          } : null,
        },
        finalEvaluation: perfEval ? { score: perfEval.score, selfScore: perfEval.selfScore, period: perfEval.period } : null,
      },
    };
  }

  private periodKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
