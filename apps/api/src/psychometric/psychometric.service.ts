import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { CreatePsychometricDto, UpdatePsychometricStatusDto } from './dto/psychometric.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class PsychometricService {
  constructor(private prisma: PrismaService, private audit: AuditService, private dataScope: DataScopeService) {}

  async create(dto: CreatePsychometricDto, user: JwtPayload) {
    const existing = await this.prisma.psychometricCase.findUnique({ where: { caseCode: dto.caseCode } });
    if (existing) throw new ConflictException('کد پرونده تکراری است');
    if (!this.dataScope.isAdmin(user) && !user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO')) {
      if (user.employeeProfileId !== dto.employeeId) throw new ForbiddenException('فقط برای خودتان می‌توانید پرونده ثبت کنید');
    }
    const result = await this.prisma.psychometricCase.create({
      data: {
        caseCode: dto.caseCode,
        employeeId: dto.employeeId,
        projectId: dto.projectId,
        assessmentType: dto.assessmentType,
        tool: dto.tool,
      },
    });
    await this.audit.logFromRequest(user, 'PSYCHOMETRIC_CASE_CREATED', 'PsychometricCase', result.id);
    return result;
  }

  async findAll(query: any, user: JwtPayload) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = {};
    if (user.roles.includes('EMPLOYEE') && !this.dataScope.isAdmin(user) && !user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO')) {
      where.employeeId = user.employeeProfileId;
    } else if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user)) {
      const subordinates = await this.prisma.employeeProfile.findMany({ where: { supervisorId: user.employeeProfileId }, select: { id: true } });
      where.employeeId = { in: subordinates.map(s => s.id) };
    }
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.search) where.caseCode = { contains: query.search, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.psychometricCase.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } }),
      this.prisma.psychometricCase.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string, user: JwtPayload) {
    const item = await this.prisma.psychometricCase.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('پرونده یافت نشد');
    return item;
  }

  async updateStatus(id: string, dto: UpdatePsychometricStatusDto, user: JwtPayload) {
    await this.findOne(id, user);
    const data: any = {};
    const now = new Date();
    if (dto.assessmentStatus === 'COMPLETED' && !dto.endTime) data.endTime = now;
    if (dto.endTime) data.endTime = new Date(dto.endTime);
    const existing = await this.prisma.psychometricCase.findUnique({ where: { id } });
    if (data.endTime && existing?.startTime) {
      data.totalDurationMinutes = Math.ceil((data.endTime.getTime() - existing.startTime.getTime()) / (1000 * 60));
    }
    Object.assign(data, {
      assessmentStatus: dto.assessmentStatus,
      analysisStatus: dto.analysisStatus,
      interpretationStatus: dto.interpretationStatus,
      reportStatus: dto.reportStatus,
      feedbackStatus: dto.feedbackStatus,
      needRevision: dto.needRevision,
      supervisorApproval: dto.supervisorApproval,
      notes: dto.notes,
    });
    for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
    const result = await this.prisma.psychometricCase.update({ where: { id }, data });
    await this.audit.logFromRequest(user, 'PSYCHOMETRIC_STATUS_UPDATED', 'PsychometricCase', id);
    return result;
  }
}
