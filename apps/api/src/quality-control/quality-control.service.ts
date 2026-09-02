import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { CreateQualityControlDto } from './dto/quality-control.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class QualityControlService {
  constructor(private prisma: PrismaService, private audit: AuditService, private dataScope: DataScopeService) {}

  async create(dto: CreateQualityControlDto, user: JwtPayload) {
    if (!user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user) && !user.roles.includes('CEO')) {
      throw new ForbiddenException('فقط سرپرست می‌تواند کنترل کیفیت ثبت کند');
    }
    const task = await this.prisma.taskAssignment.findFirst({ where: { id: dto.taskAssignmentId, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');

    if (user.roles.includes('SUPERVISOR')) {
      const emp = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId } });
      if (emp?.supervisorId !== user.employeeProfileId) throw new ForbiddenException('کارمند خارج از تیم شما');
    }

    const hasError = dto.scientificError || dto.calculationError || dto.interpretationError || dto.documentationDefect || dto.writingDefect || dto.protocolViolation;
    const result = dto.result || (hasError ? 'NEED_REVISION' : 'APPROVED');
    const score = dto.qualityScore ?? (hasError ? Math.max(50, 90 - (Object.values({ scientificError: dto.scientificError, calculationError: dto.calculationError, interpretationError: dto.interpretationError, documentationDefect: dto.documentationDefect, writingDefect: dto.writingDefect, protocolViolation: dto.protocolViolation }).filter(Boolean).length * 10)) : 90);

    const qc = await this.prisma.qualityControl.upsert({
      where: { taskAssignmentId: dto.taskAssignmentId },
      create: {
        taskAssignmentId: dto.taskAssignmentId,
        employeeId: task.employeeId,
        supervisorId: user.employeeProfileId,
        projectId: task.projectId,
        outputType: dto.outputType,
        scientificError: dto.scientificError || false,
        calculationError: dto.calculationError || false,
        interpretationError: dto.interpretationError || false,
        documentationDefect: dto.documentationDefect || false,
        writingDefect: dto.writingDefect || false,
        protocolViolation: dto.protocolViolation || false,
        needRevision: result === 'NEED_REVISION' || result === 'REJECTED',
        revisionCount: task.revisionCount,
        result,
        qualityScore: score,
        comment: dto.comment,
      },
      update: {
        outputType: dto.outputType,
        scientificError: dto.scientificError || false,
        calculationError: dto.calculationError || false,
        interpretationError: dto.interpretationError || false,
        documentationDefect: dto.documentationDefect || false,
        writingDefect: dto.writingDefect || false,
        protocolViolation: dto.protocolViolation || false,
        needRevision: result === 'NEED_REVISION' || result === 'REJECTED',
        revisionCount: task.revisionCount,
        result,
        qualityScore: score,
        comment: dto.comment,
      },
    });

    await this.prisma.taskAssignment.update({ where: { id: dto.taskAssignmentId }, data: { qualityScore: score } });

    await this.audit.logFromRequest(user, 'QUALITY_CONTROL', 'QualityControl', qc.id, undefined, { taskId: dto.taskAssignmentId, result, score } as any);
    return qc;
  }

  async findAll(query: any, user: JwtPayload) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = {};
    if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user)) where.supervisorId = user.employeeProfileId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.projectId) where.projectId = query.projectId;
    const [items, total] = await Promise.all([
      this.prisma.qualityControl.findMany({ where, skip, take, orderBy: { evaluatedAt: 'desc' }, include: { employee: { select: { id: true, firstName: true, lastName: true } } } }),
      this.prisma.qualityControl.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }
}
