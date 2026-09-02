import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { CreateCriticalIncidentDto, UpdateCriticalIncidentDto } from './dto/critical-incident.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class CriticalIncidentsService {
  constructor(private prisma: PrismaService, private audit: AuditService, private dataScope: DataScopeService) {}

  async create(dto: CreateCriticalIncidentDto, user: JwtPayload) {
    if (!user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user) && !user.roles.includes('CEO')) {
      throw new ForbiddenException('فقط سرپرست و مدیر می‌توانند حادثه بحرانی ثبت کنند');
    }
    if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user)) {
      const emp = await this.prisma.employeeProfile.findUnique({ where: { id: dto.employeeId } });
      if (emp?.supervisorId !== user.employeeProfileId) throw new ForbiddenException('کارمند خارج از تیم شما');
    }
    const emp = await this.prisma.employeeProfile.findUnique({ where: { id: dto.employeeId } });
    const supervisorId = emp?.supervisorId || user.employeeProfileId;
    const result = await this.prisma.criticalIncident.create({
      data: {
        employeeId: dto.employeeId,
        severity: dto.severity,
        type: dto.type,
        description: dto.description,
        reportedById: user.sub,
        supervisorId,
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : new Date(),
      },
    });
    await this.audit.logFromRequest(user, 'CRITICAL_INCIDENT_CREATED', 'CriticalIncident', result.id, undefined, dto as any);
    return result;
  }

  async findAll(query: any, user: JwtPayload) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = {};
    if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user)) {
      const subs = await this.prisma.employeeProfile.findMany({ where: { supervisorId: user.employeeProfileId }, select: { id: true } });
      where.employeeId = { in: subs.map(s => s.id) };
    }
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    const [items, total] = await Promise.all([
      this.prisma.criticalIncident.findMany({ where, skip, take, orderBy: { incidentDate: 'desc' }, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } }),
      this.prisma.criticalIncident.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async resolve(id: string, dto: UpdateCriticalIncidentDto, user: JwtPayload) {
    const incident = await this.prisma.criticalIncident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('حادثه یافت نشد');
    const result = await this.prisma.criticalIncident.update({
      where: { id },
      data: { resolution: dto.resolution, status: dto.status || 'RESOLVED', resolvedAt: new Date() },
    });
    await this.audit.logFromRequest(user, 'CRITICAL_INCIDENT_RESOLVED', 'CriticalIncident', id);
    return result;
  }
}
