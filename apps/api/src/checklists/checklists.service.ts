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
    if (!this.isAdmin(user) && !(await this.canSubmitDaily(dto.date))) {
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
    if (!this.isAdmin(user) && !(await this.canSubmitWeekly(dto.weekStart, dto.weekEnd))) {
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

  async getSchedule() {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'checklist_schedule' } });
    return {
      dailyStartHour: 0,
      dailyEndHour: 23,
      dailyEndMinute: 50,
      weeklyStartDay: 4,
      weeklyStartHour: 8,
      weeklyEndDay: 5,
      weeklyEndHour: 23,
      weeklyEndMinute: 50,
      ...((setting?.value || {}) as Record<string, number>),
    };
  }

  async getAdminOverview(type: 'daily' | 'weekly', from: string, to: string, user: JwtPayload, employeeId?: string) {
    if (!this.isAdmin(user)) throw new ForbiddenException('دسترسی غیرمجاز');
    const employees = await this.prisma.employeeProfile.findMany({
      where: { deletedAt: null, user: { isActive: true } },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
      orderBy: { firstName: 'asc' },
    });
    if (type === 'daily') {
      const records = await this.prisma.dailyChecklist.findMany({
        where: { ...(employeeId ? { employeeId } : {}), date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) } },
        orderBy: { date: 'asc' },
      });
      return { employees, records };
    }
    const records = await this.prisma.weeklyChecklist.findMany({
      where: { ...(employeeId ? { employeeId } : {}), weekStart: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T23:59:59.999Z`) } },
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

  private async canSubmitDaily(dateValue: string) {
    const config = await this.getSchedule();
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (dateValue !== today) return false;
    const start = config.dailyStartHour ?? 0;
    const endHour = config.dailyEndHour ?? 23;
    const endMinute = config.dailyEndMinute ?? 50;
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= start * 60 && minutes < endHour * 60 + endMinute;
  }

  private async canSubmitWeekly(startValue: string, endValue: string) {
    const config = await this.getSchedule();
    const now = new Date();
    const end = new Date(`${endValue}T00:00:00.000Z`);
    const startDay = config.weeklyStartDay;
    const endDay = config.weeklyEndDay;
    const currentDay = now.getDay();
    const daySpan = (endDay - startDay + 7) % 7;
    const windowStart = new Date(end);
    windowStart.setUTCDate(windowStart.getUTCDate() - daySpan);
    windowStart.setUTCHours(config.weeklyStartHour, 0, 0, 0);
    const windowEnd = new Date(end);
    windowEnd.setUTCHours(config.weeklyEndHour, config.weeklyEndMinute, 0, 0);
    return currentDay >= startDay && currentDay <= endDay && now >= windowStart && now <= windowEnd;
  }
}
