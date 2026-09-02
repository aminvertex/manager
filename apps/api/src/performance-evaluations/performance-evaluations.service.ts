import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { CreateEvaluationDto, UpdateEvaluationDto } from './dto/create-evaluation.dto';
import { RoleCode } from '@amatis/types';

@Injectable()
export class PerformanceEvaluationsService {
  constructor(private prisma: PrismaService) {}

  async upsert(dto: CreateEvaluationDto, supervisorId?: string) {
    const existing = await this.prisma.performanceEvaluation.findFirst({
      where: { employeeId: dto.employeeId, period: dto.period },
    });
    const data = {
      employeeId: dto.employeeId,
      projectId: dto.projectId,
      supervisorId: supervisorId || null,
      period: dto.period,
      score: dto.score,
      strengths: dto.strengths,
      improvementAreas: dto.improvementAreas,
      correctiveActions: dto.correctiveActions,
      notes: dto.notes,
    };
    if (existing) {
      return this.prisma.performanceEvaluation.update({
        where: { id: existing.id },
        data: {
          projectId: dto.projectId,
          supervisorId: supervisorId || null,
          score: dto.score,
          strengths: dto.strengths,
          improvementAreas: dto.improvementAreas,
          correctiveActions: dto.correctiveActions,
          notes: dto.notes,
        },
      });
    }
    const created = await this.prisma.performanceEvaluation.create({ data });
    // Phase 69: notify employee on evaluation
    try {
      const emp = await this.prisma.employeeProfile.findUnique({ where: { id: dto.employeeId }, select: { userId: true } });
      if (emp?.userId) {
        await this.prisma.notification.create({
          data: {
            userId: emp.userId,
            type: 'EVALUATION',
            title: 'ارزیابی جدید',
            message: `ارزیابی شما برای دوره ${dto.period} ثبت شد`,
            entityType: 'PerformanceEvaluation',
            entityId: created.id,
          },
        });
      }
    } catch { /* ignore */ }
    return created;
  }

  async update(id: string, dto: UpdateEvaluationDto, user: any) {
    const found = await this.prisma.performanceEvaluation.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('ارزیابی یافت نشد');
    if (user.role === RoleCode.SUPERVISOR && found.supervisorId !== user.sub) {
      throw new ForbiddenException('فقط ارزیابی‌های خودتان قابل ویرایش است');
    }
    return this.prisma.performanceEvaluation.update({ where: { id }, data: { ...dto } });
  }

  async findByEmployee(employeeId: string, period?: string) {
    return this.prisma.performanceEvaluation.findMany({
      where: { employeeId, ...(period ? { period } : {}) },
      include: { supervisor: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { period: 'desc' },
    });
  }

  async submitSelf(employeeId: string, dto: { score: number; period?: string; strengths?: string; improvement?: string }, user: any) {
    if (employeeId !== user.employeeProfileId) {
      throw new ForbiddenException('فقط می‌توانید خودارزیابی خودتان را ثبت کنید');
    }
    const existing = await this.prisma.performanceEvaluation.findFirst({
      where: { employeeId, period: dto.period || this.currentPeriod() },
    });
    const data = {
      employeeId,
      period: dto.period || this.currentPeriod(),
      selfScore: dto.score,
      selfStrengths: dto.strengths,
      selfImprovement: dto.improvement,
      selfSubmittedAt: new Date(),
    };
    if (existing) {
      return this.prisma.performanceEvaluation.update({ where: { id: existing.id }, data });
    }
    return this.prisma.performanceEvaluation.create({ data });
  }

  async removeSelf(id: string, user: any) {
    const found = await this.prisma.performanceEvaluation.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('ارزیابی یافت نشد');
    if (found.employeeId !== user.employeeProfileId) {
      throw new ForbiddenException('فقط می‌توانید خودارزیابی خودتان را حذف کنید');
    }
    if (found.score != null) {
      throw new ForbiddenException('این ارزیابی توسط سرپرست ثبت شده و قابل حذف نیست');
    }
    return this.prisma.performanceEvaluation.delete({ where: { id } });
  }

  private currentPeriod(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async listBySupervisor(supervisorId: string, period?: string) {
    return this.prisma.performanceEvaluation.findMany({
      where: { supervisorId, ...(period ? { period } : {}) },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { period: 'desc' },
    });
  }

  async remove(id: string) {
    return this.prisma.performanceEvaluation.delete({ where: { id } });
  }
}
