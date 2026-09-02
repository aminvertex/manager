import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { CreateTrainingDto } from './dto/training.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService, private audit: AuditService, private dataScope: DataScopeService) {}

  async create(dto: CreateTrainingDto, user: JwtPayload) {
    if (user.roles.includes('EMPLOYEE') && !this.dataScope.isAdmin(user)) {
      if (user.employeeProfileId !== dto.employeeId) throw new ForbiddenException('دسترسی غیرمجاز');
    }
    const result = await this.prisma.training.create({
      data: {
        employeeId: dto.employeeId,
        title: dto.title,
        type: dto.type || 'INTERNAL',
        instructor: dto.instructor,
        durationHours: dto.durationHours,
        status: dto.status || 'PLANNED',
        examScore: dto.examScore,
        supervisorScore: dto.supervisorScore,
        retrainingRequired: dto.retrainingRequired || false,
        notes: dto.notes,
        trainingDate: dto.trainingDate ? new Date(dto.trainingDate) : undefined,
      },
    });
    await this.audit.logFromRequest(user, 'TRAINING_CREATED', 'Training', result.id);
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
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.training.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          quiz: { select: { id: true, title: true, passScore: true, timeMinutes: true, _count: { select: { questions: true } } } },
        },
      }),
      this.prisma.training.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async update(id: string, dto: any, user: JwtPayload) {
    const training = await this.prisma.training.findUnique({ where: { id } });
    if (!training) throw new NotFoundException('آموزش یافت نشد');
    const data: any = {};
    for (const key of ['status','examScore','supervisorScore','retrainingRequired','notes','title','type','instructor','durationHours']) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (dto.trainingDate) data.trainingDate = new Date(dto.trainingDate);
    const result = await this.prisma.training.update({ where: { id }, data });
    await this.audit.logFromRequest(user, 'TRAINING_UPDATED', 'Training', id);
    return result;
  }
}
