import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.module';
import { KpiService } from '../kpi/kpi.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private kpiService: KpiService,
  ) {}

  async generateMonthlyReport(period?: string) {
    const target = period || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return this.periodKey(d);
    })();
    this.logger.log(`Generating monthly review for period: ${target}`);

    const employees = await this.prisma.employeeProfile.findMany({
      where: { deletedAt: null },
      include: {
        taskAssignments: { where: { deletedAt: null } },
      },
    });

    let created = 0;
    let updated = 0;
    for (const emp of employees) {
      const tasks = emp.taskAssignments || [];
      const completed = tasks.filter((t) => t.status === 'APPROVED').length;
      const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
      const delayed = tasks.filter((t) => t.status === 'DELAYED').length;
      const revisions = tasks.reduce((s, t) => s + t.revisionCount, 0);

      const existing = await this.prisma.monthlyReview.findUnique({
        where: { employeeId_period: { employeeId: emp.id, period: target } },
      });

      const data = {
        employeeId: emp.id,
        period: target,
        totalTasks: tasks.length,
        completionRate,
        onTimeRate: 0,
        averageQuality: null,
        revisionCount: revisions,
        checklistCompletion: null,
        numberOfCases: null,
        averageDuration: null,
        kpiScore: null,
        performanceRank: null,
        finalStatus: 'AUTO',
      };

      if (existing) {
        await this.prisma.monthlyReview.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await this.prisma.monthlyReview.create({ data });
        created++;
      }
    }
    return { period: target, created, updated, total: employees.length };
  }

  private periodKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // هر روز ساعت ۸ صبح (شنبه تا پنجشنبه) — یادآوری چک‌لیست روزانه
  @Cron('0 8 * * 1-5')
  async remindDailyChecklist() {
    const settings = await this.prisma.setting.findUnique({ where: { key: 'scheduler_settings' } });
    const cfg = (settings?.value as any) || {};
    const checklistHour = cfg.checklistReminderHour ?? 8;
    const now = new Date();
    if (now.getHours() !== checklistHour) return;
    const employees = await this.prisma.employeeProfile.findMany({
      where: { deletedAt: null, user: { isActive: true } },
      select: { id: true, userId: true, firstName: true, lastName: true },
    });
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00Z');
    const submitted = await this.prisma.dailyChecklist.findMany({
      where: { date: today },
      select: { employeeId: true },
    });
    const submittedIds = new Set(submitted.map((s) => s.employeeId));

    let count = 0;
    for (const emp of employees) {
      if (!submittedIds.has(emp.id)) {
        await this.prisma.notification.create({
          data: {
            userId: emp.userId,
            type: 'CHECKLIST_REMINDER',
            title: 'یادآوری چک‌لیست روزانه',
            message: `چک‌لیست امروز را ثبت کنید`,
            entityType: 'DailyChecklist',
          },
        });
        count++;
      }
    }
    if (count > 0) this.logger.log(`Reminded ${count} employees about daily checklist`);
  }

  // هر روز ساعت ۹ صبح — هشدار تسک‌های دیرکرد
  @Cron('0 9 * * 1-5')
  async warnDelayedTasks() {
    const settings = await this.prisma.setting.findUnique({ where: { key: 'scheduler_settings' } });
    const cfg = (settings?.value as any) || {};
    const delayHour = cfg.delayWarningHour ?? 9;
    const now = new Date();
    if (now.getHours() !== delayHour) return;
    const delayedTasks = await this.prisma.taskAssignment.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['APPROVED', 'CANCELLED'] },
        deadline: { lt: now },
      },
      include: { employee: { select: { userId: true, firstName: true, lastName: true } } },
    });

    for (const task of delayedTasks) {
      if (!task.employee?.userId) continue;
      await this.prisma.notification.create({
        data: {
          userId: task.employee.userId,
          type: 'TASK_DELAYED',
          title: 'تسک دیرکرد',
          message: `تسک "${task.assignmentCode}" دیرکرد دارد`,
          entityType: 'TaskAssignment',
          entityId: task.id,
        },
      });
    }
    if (delayedTasks.length > 0)
      this.logger.log(`Warned ${delayedTasks.length} employees about delayed tasks`);
  }

  // روز ۲۸ هر ماه ساعت ۶ صبح — تولید خودکار گزارش ماهانه در دیتابیس
  @Cron('0 6 28 * *')
  async autoGenerateMonthlyReport() {
    await this.generateMonthlyReport();
  }

  // روز ۱ هر ماه ساعت ۷ صبح — محاسبه خودکار KPI ماه قبل
  @Cron('0 7 1 * *')
  async autoCalculateMonthlyKpi() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const period = this.periodKey(d);
    this.logger.log(`Auto-calculating KPI for period: ${period}`);
    const result = await this.kpiService.recalculateAll(period);
    this.logger.log(`KPI calculated for ${(result as any)?.length || '?'} employees`);
  }
}
