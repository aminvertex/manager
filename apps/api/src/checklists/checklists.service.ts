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

  async getEmployeeCompletion(employeeId: string, from: Date, to: Date): Promise<number> {
    const checklists = await this.prisma.dailyChecklist.findMany({ where: { employeeId, date: { gte: from, lte: to } } });
    if (checklists.length === 0) return 0;
    return Math.round(checklists.reduce((s, c) => s + c.completionRate, 0) / checklists.length);
  }

  private async ensureSelf(employeeId: string, user: JwtPayload) {
    if (this.dataScope.isAdmin(user) || user.roles.includes('SUPERVISOR') || user.roles.includes('CEO')) return;
    if (user.employeeProfileId !== employeeId) throw new ForbiddenException('دسترسی غیرمجاز');
  }
}
