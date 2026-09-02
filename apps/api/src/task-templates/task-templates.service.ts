import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto, TaskTemplateQueryDto } from './dto/task-template.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class TaskTemplatesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(query: TaskTemplateQueryDto) {
    const { skip, take, page, limit } = getPaginationParams(query as any);
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { taskCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.projectId) where.projectId = query.projectId;

    const [items, total] = await Promise.all([
      this.prisma.taskTemplate.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { project: { select: { id: true, name: true, code: true } } } }),
      this.prisma.taskTemplate.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const item = await this.prisma.taskTemplate.findFirst({ where: { id, deletedAt: null }, include: { project: true } });
    if (!item) throw new NotFoundException('قالب تسک یافت نشد');
    return item;
  }

  async create(dto: CreateTaskTemplateDto, user: JwtPayload) {
    const count = await this.prisma.taskTemplate.count();
    const taskCode = `TASK-${String(count + 1).padStart(4, '0')}`;
    const existing = await this.prisma.taskTemplate.findUnique({ where: { taskCode } });
    if (existing) throw new ConflictException('کد تسک تکراری');

    const created = await this.prisma.taskTemplate.create({
      data: {
        taskCode,
        name: dto.name,
        category: dto.category,
        projectId: dto.projectId,
        description: dto.description,
        expectedOutput: dto.expectedOutput,
        standardDurationMinutes: dto.standardDurationMinutes,
        priority: dto.priority || 'MEDIUM',
        frequency: dto.frequency,
        requiredSkillLevel: dto.requiredSkillLevel,
        requiresSupervisorApproval: dto.requiresSupervisorApproval ?? false,
        relatedKpi: dto.relatedKpi,
      },
    });
    await this.audit.logFromRequest(user, 'TASK_TEMPLATE_CREATED', 'TaskTemplate', created.id, undefined, { taskCode, name: dto.name } as any);
    return created;
  }

  async update(id: string, dto: UpdateTaskTemplateDto, user: JwtPayload) {
    await this.findOne(id);
    const updated = await this.prisma.taskTemplate.update({ where: { id }, data: dto as any });
    await this.audit.logFromRequest(user, 'TASK_TEMPLATE_UPDATED', 'TaskTemplate', id, undefined, dto as any);
    return updated;
  }

  async softDelete(id: string, user: JwtPayload) {
    await this.findOne(id);
    await this.prisma.taskTemplate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.audit.logFromRequest(user, 'TASK_TEMPLATE_DELETED', 'TaskTemplate', id);
    return { message: 'قالب تسک حذف شد' };
  }
}
