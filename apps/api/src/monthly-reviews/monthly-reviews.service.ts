import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { KpiService } from '../kpi/kpi.service';
import { computeOnTimeRate } from '../common/kpi-engine';
import { classifyPerformance } from '../common/kpi-engine';

@Injectable()
export class MonthlyReviewsService {
  private readonly logger = new Logger(MonthlyReviewsService.name);
  constructor(private prisma: PrismaService, private kpi: KpiService) {}

  async generateForEmployee(employeeId: string, period: string) {
    const [y, m] = period.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const tasks = await this.prisma.taskAssignment.findMany({ where: { employeeId, deletedAt: null, createdAt: { gte: start, lte: end } } });
    const totalTasks = tasks.length;
    const completed = tasks.filter(t => t.status === 'APPROVED').length;
    const completionRate = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
    const onTimeRate = computeOnTimeRate(tasks);
    const revisionCount = tasks.reduce((s, t) => s + t.revisionCount, 0);

    const qcs = await this.prisma.qualityControl.findMany({ where: { employeeId, createdAt: { gte: start, lte: end } } });
    const avgQuality = qcs.length ? Math.round(qcs.reduce((s, q) => s + (q.qualityScore || 0), 0) / qcs.length) : null;

    const checklists = await this.prisma.dailyChecklist.findMany({ where: { employeeId, date: { gte: start, lte: end } } });
    const checklistCompletion = checklists.length ? Math.round(checklists.reduce((s, c) => s + c.completionRate, 0) / checklists.length) : null;

    const cases = await this.prisma.psychometricCase.findMany({ where: { employeeId, createdAt: { gte: start, lte: end } } });
    const caseDurations = cases.filter(c => c.totalDurationMinutes).map(c => c.totalDurationMinutes!);
    const avgDuration = caseDurations.length ? Math.round(caseDurations.reduce((s, d) => s + d, 0) / caseDurations.length) : null;

    const kpi = await this.kpi.recalculateForEmployee(employeeId, period);
    const kpiScore = kpi.finalScore;
    const classification = kpi.classification;
    const performanceRank = classifyPerformance(kpiScore).label;

    const review = await this.prisma.monthlyReview.upsert({
      where: { employeeId_period: { employeeId, period } },
      create: {
        employeeId, period,
        totalTasks, completionRate, onTimeRate, averageQuality: avgQuality,
        revisionCount, checklistCompletion, numberOfCases: cases.length,
        averageDuration: avgDuration, kpiScore,
        performanceRank, finalStatus: 'GENERATED',
      },
      update: {
        totalTasks, completionRate, onTimeRate, averageQuality: avgQuality,
        revisionCount, checklistCompletion, numberOfCases: cases.length,
        averageDuration: avgDuration, kpiScore,
        performanceRank, finalStatus: 'GENERATED',
      },
    });

    this.logger.log(`Monthly review generated for ${employeeId} (${period}): score=${kpiScore}`);
    return review;
  }

  async generateAll(period: string) {
    const employees = await this.prisma.employeeProfile.findMany({ where: { deletedAt: null } });
    const results = [];
    for (const emp of employees) results.push(await this.generateForEmployee(emp.id, period));
    return { count: results.length, results };
  }

  async findAll(query: any) {
    const where: any = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.period) where.period = query.period;
    return this.prisma.monthlyReview.findMany({ where, orderBy: { period: 'desc' }, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } });
  }
}
