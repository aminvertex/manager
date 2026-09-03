import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { SubmitDailyChecklistDto, SubmitWeeklyChecklistDto, ChecklistQueryDto } from './dto/checklist.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { DAILY_CHECKLIST_ITEMS } from '@amatis/shared';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private dataScope: DataScopeService) {}

  private computeCompletion(items: Record<string, string>, totalItems?: number): number {
    const entries = Object.entries(items);
    const total = totalItems && totalItems > 0 ? totalItems : entries.length;
    if (total === 0) return 0;
    const answered = entries.filter(([, v]) => v === 'YES' || v === 'NO').length;
    return Math.round((answered / total) * 100);
  }

  async submitDaily(employeeId: string, dto: SubmitDailyChecklistDto, user: JwtPayload) {
    await this.ensureSelf(employeeId, user);
    if (!this.isAdmin(user) && !this.canSubmitDaily(dto.date)) {
      throw new BadRequestException('مهلت ثبت چک‌لیست امروز به پایان رسیده است');
    }
    const date = new Date(dto.date + 'T00:00:00.000Z');
    const completionRate = this.computeCompletion(dto.items, DAILY_CHECKLIST_ITEMS.length);
    const existing = await this.prisma.dailyChecklist.findUnique({
        where: { employeeId_date: { employeeId, date } },
      });
    const result = existing
      ? await this.prisma.dailyChecklist.update({ where: { id: existing.id }, data: { items: dto.items as any, completionRate, notes: dto.notes } })
      : await this.prisma.dailyChecklist.create({ data: { employeeId, date, items: dto.items as any, completionRate, notes: dto.notes } });
    await this.audit.logFromRequest(user, 'DAILY_CHECKLIST_SUBMITTED', 'DailyChecklist', result.id);
    return { ...result, completionRate };
  }

  async getDaily(employeeId: string, user: JwtPayload, query: ChecklistQueryDto) {
    await this.ensureSelf(employeeId, user);
    const where: any = { employeeId };
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }
    return this.prisma.dailyChecklist.findMany({ where, orderBy: { date: 'desc' }, take: 60 });
  }

  async submitWeekly(employeeId: string, dto: SubmitWeeklyChecklistDto, user: JwtPayload) {
    await this.ensureSelf(employeeId, user);
    if (!this.isAdmin(user) && !this.canSubmitWeekly(dto.weekStart, dto.weekEnd)) {
      throw new BadRequestException('مهلت ثبت چک‌لیست این هفته به پایان رسیده است');
    }
    const completionRate = this.computeCompletion(dto.items);
    const weekStart = new Date(dto.weekStart + 'T00:00:00.000Z');
    const weekEnd = new Date(dto.weekEnd + 'T00:00:00.000Z');
    const existing = await this.prisma.weeklyChecklist.findUnique({ where: { employeeId_weekStart: { employeeId, weekStart } } });
    const data = {
      employeeId, weekStart, weekEnd,
      items: dto.items as any,
      completionRate,
      performanceScore: dto.performanceScore,
      strengths: dto.strengths,
      improvementAreas: dto.improvementAreas,
      correctiveActions: dto.correctiveActions,
      actionOwner: dto.actionOwner,
      actionDeadline: dto.actionDeadline ? new Date(dto.actionDeadline) : undefined,
    };
    const result = existing
      ? await this.prisma.weeklyChecklist.update({ where: { id: existing.id }, data })
      : await this.prisma.weeklyChecklist.create({ data });
    await this.audit.logFromRequest(user, 'WEEKLY_CHECKLIST_SUBMITTED', 'WeeklyChecklist', result.id);
    return { ...result, completionRate };
  }

  async getWeekly(employeeId: string, user: JwtPayload) {
    await this.ensureSelf(employeeId, user);
    return this.prisma.weeklyChecklist.findMany({ where: { employeeId }, orderBy: { weekStart: 'desc' }, take: 12 });
  }

  async getAdminOverview(type: 'daily' | 'weekly', from: string, to: string, user: JwtPayload) {
    if (!this.isAdmin(user)) throw new ForbiddenException('دسترسی غیرمجاز');
    const employees = await this.prisma.employeeProfile.findMany({
      where: { deletedAt: null, user: { isActive: true } },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: { firstName: 'asc' },
    });
    if (type === 'daily') {
      const records = await this.prisma.dailyChecklist.findMany({
        where: { date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) } },
        orderBy: { date: 'asc' },
      });
      return { employees, records };
    }
    const records = await this.prisma.weeklyChecklist.findMany({
      where: { weekStart: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) } },
      orderBy: { weekStart: 'asc' },
    });
    return { employees, records };
  }

  async getEmployeeCompletion(employeeId: string, from: Date, to: Date): Promise<number> {
    const checklists = await this.prisma.dailyChecklist.findMany({ where: { employeeId, date: { gte: from, lte: to } } });
    if (checklists.length === 0) return 0;
    return Math.round(checklists.reduce((sum: number, checklist: { completionRate: number }) => sum + checklist.completionRate, 0) / checklists.length);
  }

  private async ensureSelf(employeeId: string, user: JwtPayload) {
    if (this.dataScope.isAdmin(user) || user.roles.includes('SUPERVISOR') || user.roles.includes('CEO')) return;
    if (user.employeeProfileId !== employeeId) throw new ForbiddenException('دسترسی غیرمجاز');
  }

  private isAdmin(user: JwtPayload) {
    return this.dataScope.isAdmin(user) || user.roles.includes('CEO') || user.roles.includes('TECH_COMMITTEE_MANAGER');
  }

  private canSubmitDaily(dateValue: string) {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (dateValue !== today) return false;
    return now.getHours() < 23 || (now.getHours() === 23 && now.getMinutes() < 50);
  }

  private canSubmitWeekly(startValue: string, endValue: string) {
    const now = new Date();
    const start = new Date(`${startValue}T00:00:00.000Z`);
    const end = new Date(`${endValue}T00:00:00.000Z`);
    return now >= start && now <= new Date(end.getTime() + (23 * 60 + 50) * 60 * 1000);
  }
}
