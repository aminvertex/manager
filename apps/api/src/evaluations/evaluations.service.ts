import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { CreateEvaluationDto, EVALUATION_CRITERIA, EVALUATION_RESULTS } from './dto/evaluation.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class EvaluationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private dataScope: DataScopeService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateEvaluationDto, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id: dto.taskAssignmentId, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    if (!user.employeeProfileId) {
      throw new ForbiddenException('کاربر ارزیاب باید پروفایل کارمندی داشته باشد');
    }

    const isProjectSupervisor = task.projectId
      ? !!(await this.prisma.project.findFirst({
          where: { id: task.projectId, managerId: user.employeeProfileId },
        }))
      : false;
    const isDirectSupervisor = user.roles.includes('SUPERVISOR') &&
      !!(await this.prisma.employeeProfile.findFirst({
        where: { id: task.employeeId, supervisorId: user.employeeProfileId },
      }));
    if (
      task.employeeId === user.employeeProfileId &&
      !this.dataScope.isAdmin(user) &&
      !user.roles.includes('CEO') &&
      !user.roles.includes('TECH_COMMITTEE_MANAGER')
    ) {
      throw new ForbiddenException('نمی‌توانید تسک خودتان را ارزیابی کنید');
    }
    // Evaluation is only possible for a submitted/resubmitted task by its
    // direct or project supervisor (or an administrator).
    if (!['SUBMITTED', 'RESUBMITTED'].includes(task.status) || (!isProjectSupervisor && !isDirectSupervisor && !this.dataScope.isAdmin(user))) {
      throw new ForbiddenException('فقط سرپرست پروژه می‌تواند تسک ارسال‌شده را ارزیابی کند');
    }
    if (user.roles.includes('SUPERVISOR') && !isProjectSupervisor) {
      const emp = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId } });
      if (emp?.supervisorId !== user.employeeProfileId) throw new ForbiddenException('کارمند خارج از تیم شما');
    }

    // validate scores
    const scores = dto.scores;
    for (const key of EVALUATION_CRITERIA) {
      const val = scores[key];
      if (val === undefined || val < 1 || val > 5) {
        throw new BadRequestException(`امتیاز ${key} باید بین ۱ تا ۵ باشد`);
      }
    }
    const values = Object.values(scores) as number[];
    const average = values.reduce((s, v) => s + v, 0) / values.length;
    const score100 = Math.round((average / 5) * 100);

    const result = dto.result || 'APPROVED';
    if (!EVALUATION_RESULTS.includes(result as typeof EVALUATION_RESULTS[number])) {
      throw new BadRequestException('نتیجه ارزیابی فقط می‌تواند تأیید یا نیازمند اصلاح باشد');
    }
    const evaluation = await this.prisma.supervisorEvaluation.upsert({
      where: { taskAssignmentId: dto.taskAssignmentId },
      create: {
        taskAssignmentId: dto.taskAssignmentId,
        employeeId: task.employeeId,
        supervisorId: user.employeeProfileId!,
        scores: scores as any,
        averageScore: average,
        score100,
        result,
        comment: dto.comment,
      },
      update: {
        scores: scores as any,
        averageScore: average,
        score100,
        result,
        comment: dto.comment,
        evaluatedAt: new Date(),
      },
    });

    // sync task status based on result
    let newStatus = task.status;
    if (result === 'APPROVED' || result === 'APPROVED_WITH_COMMENT') newStatus = 'APPROVED';
    else if (result === 'NEED_REVISION') newStatus = 'NEED_REVISION';
    else if (result === 'REJECTED') newStatus = 'REJECTED';

    await this.prisma.taskAssignment.update({
      where: { id: dto.taskAssignmentId },
      data: {
        status: newStatus,
        supervisorScore: score100,
        qualityScore: score100,
        completionTime: result.startsWith('APPROVED') ? new Date() : task.completionTime,
      },
    });

    // notify employee
    const empUser = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId }, select: { userId: true, firstName: true } });
    if (empUser) {
      const labels: Record<string, string> = { APPROVED: 'تأیید شد', APPROVED_WITH_COMMENT: 'تأیید با نظر', NEED_REVISION: 'نیازمند اصلاح', REJECTED: 'رد شد' };
      await this.notifications.create({
        userId: empUser.userId,
        type: `EVALUATION_${result}`,
        title: 'ارزیابی سرپرست',
        message: `نتیجه ارزیابی تسک شما: ${labels[result]} (امتیاز ${score100})`,
        entityType: 'SupervisorEvaluation',
        entityId: evaluation.id,
      });
    }

    await this.audit.logFromRequest(user, 'SUPERVISOR_EVALUATION', 'SupervisorEvaluation', evaluation.id, undefined, { taskId: dto.taskAssignmentId, score100, result } as any);
    return { ...evaluation, score100 };
  }

  async findAll(query: any, user: JwtPayload) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const where: any = {};
    if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user)) {
      where.supervisorId = user.employeeProfileId;
    }
    if (query.employeeId) where.employeeId = query.employeeId;
    const [items, total] = await Promise.all([
      this.prisma.supervisorEvaluation.findMany({
        where,
        skip,
        take,
        orderBy: { evaluatedAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, taskTemplate: { select: { name: true } }, project: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.supervisorEvaluation.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(id: string) {
    const evalRow = await this.prisma.supervisorEvaluation.findUnique({ where: { id } });
    if (!evalRow) throw new NotFoundException('ارزیابی یافت نشد');
    return evalRow;
  }
}
