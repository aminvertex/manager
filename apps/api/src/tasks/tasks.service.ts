import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@amatis/types';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { CreateTaskDto, UpdateTaskStatusDto, RequestRevisionDto, TaskQueryDto, STATUS_TRANSITIONS } from './dto/task.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService, private audit: AuditService, private dataScope: DataScopeService) {}

  private calculateDelay(deadline: Date | null, completionTime: Date | null, status: string) {
    if (!deadline) return { isDelayed: false, delayDays: 0, isLateDelivery: false };
    const now = new Date();
    const deadlineTime = new Date(deadline);
    let isDelayed = false;
    let delayDays = 0;
    let isLateDelivery = false;

    if (!['APPROVED','CANCELLED'].includes(status)) {
      if (now > deadlineTime) {
        isDelayed = true;
        delayDays = Math.ceil((now.getTime() - deadlineTime.getTime()) / (1000*60*60*24));
      }
    }
    if (completionTime && completionTime > deadlineTime) {
      isLateDelivery = true;
      if (!isDelayed) {
        delayDays = Math.ceil((completionTime.getTime() - deadlineTime.getTime()) / (1000*60*60*24));
      }
    }
    return { isDelayed, delayDays, isLateDelivery };
  }

  private async ensureCanAccess(task: any, user: JwtPayload) {
    if (
      this.dataScope.isAdmin(user) ||
      user.roles.includes('CEO') ||
      user.roles.includes('TECH_COMMITTEE_MANAGER')
    ) return;
    if (task.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: task.projectId },
        select: { managerId: true },
      });
      if (project?.managerId === user.employeeProfileId) return;
    }
    const isExpert = [
      'EMPLOYEE', 'EXPERT_L1', 'EXPERT_L2', 'EXPERT_L3',
      'TECH_COMMITTEE_MEMBER', 'TECH_COMMITTEE_MANAGER', 'SALES_CONSULTANT',
    ].some((role) => user.roles.includes(role));
    if (isExpert && !user.roles.includes('SUPERVISOR')) {
      if (task.employeeId !== user.employeeProfileId) throw new ForbiddenException('دسترسی غیرمجاز به تسک');
    }
    if (user.roles.includes('SUPERVISOR')) {
      if (task.employeeId === user.employeeProfileId) return;
      const emp = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId } });
      if (emp?.supervisorId !== user.employeeProfileId && task.assignedById !== user.employeeProfileId) {
        // also allow if supervisor of that employee
        // check if any subordinate
        const isSubordinate = await this.prisma.employeeProfile.findFirst({ where: { id: task.employeeId, supervisorId: user.employeeProfileId } });
        if (!isSubordinate) throw new ForbiddenException('این تسک خارج از محدوده تیم شما است');
      }
    }
  }

  async create(dto: CreateTaskDto, user: JwtPayload) {
    const isPersonal = !!dto.isPersonal;
    const template = dto.taskTemplateId
      ? await this.prisma.taskTemplate.findFirst({ where: { id: dto.taskTemplateId, deletedAt: null } })
      : null;
    if (dto.taskTemplateId && !template) throw new NotFoundException('قالب تسک یافت نشد');
    const employee = await this.prisma.employeeProfile.findFirst({ where: { id: dto.employeeId, deletedAt: null } });
    if (!employee) throw new NotFoundException('کارمند یافت نشد');

    // personal tasks can only be created by the employee themselves
    if (isPersonal && dto.employeeId !== user.employeeProfileId) {
      throw new ForbiddenException('تسک شخصی فقط برای خودتان قابل ایجاد است');
    }

    // employees (non-supervisor, non-manager) can only create personal tasks
    const isEmployeeOnly = user.roles.includes('EMPLOYEE') || user.roles.includes('EXPERT_L1') || user.roles.includes('EXPERT_L2') || user.roles.includes('EXPERT_L3') || user.roles.includes('SALES_CONSULTANT');
    if (isEmployeeOnly && !this.dataScope.isAdmin(user) && !isPersonal) {
      throw new ForbiddenException('کارشناس فقط می‌تواند تسک شخصی ایجاد کند');
    }

// Supervisors assign to their team or to members of projects they manage.
if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user) && !isPersonal) {
  if (dto.employeeId === user.employeeProfileId) {
    throw new ForbiddenException('سرپرست نمی‌تواند تسک را به خودش اختصاص دهد');
  }
  const isInTeam = await this.prisma.employeeProfile.findFirst({ where: { id: dto.employeeId, supervisorId: user.employeeProfileId } });
      if (isInTeam) { /* ok */ }
      else if (dto.projectId) {
        const isProjMgr = await this.prisma.project.findFirst({ where: { id: dto.projectId, managerId: user.employeeProfileId } });
        if (isProjMgr) {
          const memberOfProj = await this.prisma.projectMember.findFirst({ where: { projectId: dto.projectId, employeeId: dto.employeeId } });
          if (!memberOfProj) throw new ForbiddenException('کارمند عضو این پروژه نیست');
        } else {
          throw new ForbiddenException('شما سرپرست این پروژه نیستید');
        }
      } else {
        throw new ForbiddenException('شما فقط می‌توانید به اعضای تیم یا پروژه‌های خود تسک اختصاص دهید');
      }
    }

    const isTechnicalManager = user.roles.includes('TECH_COMMITTEE_MANAGER');
    const isCeo = user.roles.includes('CEO');
    if ((isTechnicalManager || isCeo) && !isPersonal && dto.projectId && !this.dataScope.isAdmin(user)) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException('پروژه یافت نشد');
      const isMember = await this.prisma.projectMember.findFirst({
        where: { projectId: dto.projectId, employeeId: dto.employeeId },
      });
      if (!isMember && project.managerId !== dto.employeeId) {
        throw new ForbiddenException('تسک فقط به اعضای همین پروژه قابل اختصاص است');
      }
    }

    const count = await this.prisma.taskAssignment.count();
    const assignmentCode = `ASN-${String(count + 1).padStart(5, '0')}`;
    const assignedById = user.employeeProfileId || null;

    const task = await this.prisma.taskAssignment.create({
      data: {
        assignmentCode,
        taskTemplateId: template?.id || null,
        employeeId: dto.employeeId,
        projectId: dto.projectId || template?.projectId,
        assignedById,
        status: 'NOT_STARTED',
        priority: dto.priority || template?.priority || 'MEDIUM',
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        notes: dto.notes || (isPersonal ? dto.taskName : undefined),
        isPersonal,
      },
      include: { taskTemplate: true, employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Phase 19: many-to-many task<->project
    if (dto.projectIds?.length) {
      const ids = new Set<string>([...dto.projectIds, ...(dto.projectId ? [dto.projectId] : []), ...(template?.projectId ? [template.projectId] : [])].filter(Boolean));
      await this.prisma.taskProject.createMany({
        data: Array.from(ids).map((projectId) => ({ taskId: task.id, projectId })),
        skipDuplicates: true,
      });
    }

    await this.prisma.taskStatusHistory.create({ data: { taskAssignmentId: task.id, fromStatus: null, toStatus: 'NOT_STARTED', changedById: assignedById } });

    // notification stub: create notification for employee
    const empUser = await this.prisma.employeeProfile.findUnique({ where: { id: dto.employeeId }, select: { userId: true } });
    if (empUser) {
      const taskName = template?.name || dto.taskName || 'تسک شخصی';
      await this.prisma.notification.create({ data: { userId: empUser.userId, type: 'TASK_ASSIGNED', title: 'تسک جدید', message: `تسک "${taskName}" به شما اختصاص داده شد`, entityType: 'TaskAssignment', entityId: task.id } });
    }

    await this.audit.logFromRequest(user, 'TASK_ASSIGNED', 'TaskAssignment', task.id, undefined, { assignmentCode, employeeId: dto.employeeId } as any);
    return task;
  }

  async findAll(query: TaskQueryDto, user: JwtPayload) {
    const { skip, take, page, limit } = getPaginationParams(query as any);
    const where: any = { deletedAt: null };

    // data scope
    if (user.roles.includes('EMPLOYEE') && !this.dataScope.isAdmin(user) && !user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO')) {
      where.employeeId = user.employeeProfileId;
    } else if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user) && !user.roles.includes('CEO')) {
      // supervisor sees team tasks
      if (query.projectId) {
        // If supervisor is manager or member of the project, show ALL project tasks
        const isMgr = await this.prisma.project.findFirst({ where: { id: query.projectId, managerId: user.employeeProfileId } });
        const isMember = await this.prisma.projectMember.findFirst({ where: { projectId: query.projectId, employeeId: user.employeeProfileId } });
        if (!isMgr && !isMember) {
          // else: must at least have subordinates in the project
          const subEmp = await this.prisma.employeeProfile.findMany({ where: { supervisorId: user.employeeProfileId }, select: { id: true } });
          const subInProj = await this.prisma.projectMember.findFirst({ where: { projectId: query.projectId, employeeId: { in: subEmp.map(s => s.id) } } });
          if (!subInProj) throw new ForbiddenException('دسترسی به تسک‌های این پروژه مجاز نیست');
        }
      } else if (query.employeeId) {
        const emp = await this.prisma.employeeProfile.findUnique({ where: { id: query.employeeId } });
        if (emp?.supervisorId !== user.employeeProfileId) throw new ForbiddenException('کارمند خارج از تیم شما');
        where.employeeId = query.employeeId;
      } else {
        const subordinates = await this.prisma.employeeProfile.findMany({ where: { supervisorId: user.employeeProfileId }, select: { id: true } });
        const ids = subordinates.map(s => s.id);
        ids.push(user.employeeProfileId!);
        where.employeeId = { in: ids };
      }
    } else {
      if (query.employeeId) where.employeeId = query.employeeId;
    }

    if (query.search) where.taskTemplate = { name: { contains: query.search, mode: 'insensitive' } };
    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    if (query.priority) where.priority = query.priority;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const orderBy: any = {};
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.taskAssignment.findMany({
        where, skip, take, orderBy,
        include: {
          taskTemplate: { select: { id: true, name: true, category: true, expectedOutput: true } },
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          project: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.taskAssignment.count({ where }),
    ]);

    // enrich with delay calc
    const enriched = items.map(t => {
      const delay = this.calculateDelay(t.deadline, t.completionTime, t.status);
      return { ...t, isDelayed: delay.isDelayed, delayDays: delay.delayDays, isLateDelivery: delay.isLateDelivery };
    });

    return paginate(enriched, total, page, limit);
  }

  async findOne(id: string, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({
      where: { id, deletedAt: null },
      include: {
        taskTemplate: true,
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, supervisorId: true } },
        project: true,
        projects: { include: { project: { select: { id: true, name: true, code: true } } } },
        statusHistory: { orderBy: { createdAt: 'desc' }, include: { changedBy: { select: { id: true, firstName: true, lastName: true } } } },
        revisions: { orderBy: { revisionNumber: 'desc' } },
        attachments: { orderBy: { createdAt: 'desc' } },
        comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { id: true, mobile: true, employeeProfile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } } },
        evaluation: true,
        qualityControl: true,
      },
    });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    const delay = this.calculateDelay(task.deadline, task.completionTime, task.status);
    return { ...task, isDelayed: delay.isDelayed, delayDays: delay.delayDays, isLateDelivery: delay.isLateDelivery };
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);

    const isAssignee = task.employeeId === user.employeeProfileId;

    // Determine project supervisor: manager of the project OR direct supervisor of assignee
    let isProjectSupervisor = false;
    if (task.projectId) {
      const projMgr = await this.prisma.project.findFirst({
        where: { id: task.projectId, managerId: user.employeeProfileId },
      });
      if (projMgr) isProjectSupervisor = true;
    }
    if (user.roles.includes(RoleCode.SUPERVISOR) && !isProjectSupervisor) {
      if (!isProjectSupervisor) {
        const emp = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId }, select: { supervisorId: true } });
        if (emp?.supervisorId === user.employeeProfileId) isProjectSupervisor = true;
      }
    }

    // Kanban workflow permission rules
    const from = task.status;
    const to = dto.status;
    const hasFullStatusAccess =
      this.dataScope.isAdmin(user) ||
      user.roles.includes(RoleCode.CEO) ||
      user.roles.includes(RoleCode.TECH_COMMITTEE_MANAGER);
    if (!hasFullStatusAccess && !(STATUS_TRANSITIONS[from] || []).includes(to)) {
      throw new BadRequestException(`تغییر وضعیت از ${from} به ${to} مجاز نیست`);
    }

    // APPROVED is a derived workflow state: it can only be reached after a
    // supervisor/project-supervisor evaluation, never by a direct status edit.
    if (to === 'APPROVED' && !hasFullStatusAccess) {
      const evaluation = await this.prisma.supervisorEvaluation.findUnique({
        where: { taskAssignmentId: task.id },
        select: { result: true, supervisorId: true },
      });
      const isSupervisor = isProjectSupervisor || user.roles.includes(RoleCode.SUPERVISOR);
      if (
        !evaluation ||
        !['APPROVED', 'APPROVED_WITH_COMMENT'].includes(evaluation.result) ||
        (isSupervisor && evaluation.supervisorId !== user.employeeProfileId)
      ) {
        throw new ForbiddenException('تأیید تسک فقط پس از ثبت ارزیابی سرپرست یا سرپرست پروژه ممکن است');
      }
    }
    if (hasFullStatusAccess) {
      return this.finalizeStatusChange(task, dto, user, from, to);
    }

    if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(from)) {
      throw new ForbiddenException('تسک در وضعیت نهایی است و قابل تغییر نیست');
    }

    // ---- Non-admin workflow ----

    // Assignee transitions (کارشناس/مسئول تسک)
    const assigneeAllowed: Record<string, string[]> = {
      ASSIGNED: ['NOT_STARTED', 'IN_PROGRESS'],
      NOT_STARTED: ['IN_PROGRESS'],
      IN_PROGRESS: ['SUBMITTED'],
      DELAYED: ['IN_PROGRESS'],
      NEED_REVISION: ['NOT_STARTED', 'IN_PROGRESS'],
    };
    if (isAssignee && (assigneeAllowed[from] || []).includes(to)) {
      return this.finalizeStatusChange(task, dto, user, from, to);
    }

    // Project supervisor: only approve/reject SUBMITTED
    if (isProjectSupervisor && from === 'SUBMITTED' && ['APPROVED','NEED_REVISION'].includes(to)) {
      return this.finalizeStatusChange(task, dto, user, from, to);
    }

    throw new ForbiddenException('شما مجاز به این تغییر وضعیت نیستید');
  }

  private async finalizeStatusChange(task: any, dto: UpdateTaskStatusDto, user: JwtPayload, from: string, to: string) {
    const updateData: any = { status: to };
    if (to === 'IN_PROGRESS' && !task.startTime) updateData.startTime = new Date();
    if (['APPROVED','REJECTED','CANCELLED'].includes(to)) {
      updateData.completionTime = new Date();
      if (task.startTime) {
        const dur = Math.ceil((new Date().getTime() - task.startTime.getTime()) / (1000*60));
        updateData.actualDurationMinutes = dur;
      }
    }
    if (to === 'SUBMITTED' || to === 'RESUBMITTED') updateData.progress = 100;

    const delay = this.calculateDelay(task.deadline, updateData.completionTime || task.completionTime, to);
    updateData.isDelayed = delay.isDelayed;
    updateData.delayDays = delay.delayDays;
    updateData.isLateDelivery = delay.isLateDelivery;

    const updated = await this.prisma.taskAssignment.update({ where: { id: task.id }, data: updateData });
    await this.prisma.taskStatusHistory.create({ data: { taskAssignmentId: task.id, fromStatus: from, toStatus: to, changedById: user.employeeProfileId, comment: dto.comment } });

    if (dto.comment) {
      await this.prisma.taskComment.create({ data: { taskAssignmentId: task.id, authorId: user.sub, message: dto.comment } });
    }

    // notifications for status changes that matter
    if (['SUBMITTED','RESUBMITTED'].includes(to)) {
      const emp = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId } });
      if (emp?.supervisorId) {
        const sup = await this.prisma.employeeProfile.findUnique({ where: { id: emp.supervisorId } });
        if (sup) await this.prisma.notification.create({ data: { userId: sup.userId, type: 'TASK_SUBMITTED', title: 'تسک ارسال شد', message: `کارشناس ${emp.firstName} تسک را ارسال کرد`, entityType: 'TaskAssignment', entityId: task.id } });
      }
    }
    if (['NEED_REVISION','APPROVED','REJECTED'].includes(to)) {
      const empUser = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId } });
      if (empUser) {
        const map: any = { NEED_REVISION: 'نیازمند اصلاح', APPROVED: 'تأیید شد', REJECTED: 'رد شد' };
        await this.prisma.notification.create({ data: { userId: empUser.userId, type: `TASK_${to}`, title: map[to] || to, message: `تسک شما ${map[to]}`, entityType: 'TaskAssignment', entityId: task.id } });
      }
    }

    await this.audit.logFromRequest(user, 'TASK_STATUS_CHANGED', 'TaskAssignment', task.id, { from }, { to } as any);
    return updated;
  }

  async updateProgress(id: string, progress: number, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    if (task.employeeId !== user.employeeProfileId && !this.dataScope.isAdmin(user)) {
      // supervisor can also update? but restrict to assignee
      throw new ForbiddenException('فقط کارمند مسئول می‌تواند پیشرفت را تغییر دهد');
    }
    if (['APPROVED','REJECTED','CANCELLED'].includes(task.status)) throw new BadRequestException('تسک تمام شده');
    const updated = await this.prisma.taskAssignment.update({ where: { id }, data: { progress } });
    return updated;
  }

  async requestRevision(id: string, dto: RequestRevisionDto, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    const isProjectSupervisor = task.projectId
      ? !!(await this.prisma.project.findFirst({
          where: { id: task.projectId, managerId: user.employeeProfileId },
        }))
      : false;
    const isDirectSupervisor = user.roles.includes('SUPERVISOR') &&
      !!(await this.prisma.employeeProfile.findFirst({
        where: { id: task.employeeId, supervisorId: user.employeeProfileId },
      }));
    if (task.status !== 'SUBMITTED' || (!isProjectSupervisor && !isDirectSupervisor && !this.dataScope.isAdmin(user))) {
      throw new ForbiddenException('فقط سرپرست پروژه می‌تواند برای تسک ارسال‌شده درخواست اصلاح دهد');
    }

    const revisionNumber = task.revisionCount + 1;
    const revision = await this.prisma.taskRevision.create({
      data: {
        taskAssignmentId: id,
        revisionNumber,
        requestedById: user.employeeProfileId,
        reason: dto.reason,
        comment: dto.comment,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: 'PENDING',
      },
    });
    const updated = await this.prisma.taskAssignment.update({ where: { id }, data: { status: 'NEED_REVISION', revisionCount: revisionNumber } });
    await this.prisma.taskStatusHistory.create({ data: { taskAssignmentId: id, fromStatus: task.status, toStatus: 'NEED_REVISION', changedById: user.employeeProfileId, comment: dto.reason } });

    const empUser = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId } });
    if (empUser) await this.prisma.notification.create({ data: { userId: empUser.userId, type: 'NEED_REVISION', title: 'نیازمند اصلاح', message: `سرپرست درخواست اصلاح برای تسک ثبت کرد: ${dto.reason}`, entityType: 'TaskAssignment', entityId: id } });

    await this.audit.logFromRequest(user, 'TASK_REVISION_REQUESTED', 'TaskRevision', revision.id, undefined, dto as any);
    return { task: updated, revision };
  }

  async addComment(id: string, message: string, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    const comment = await this.prisma.taskComment.create({ data: { taskAssignmentId: id, authorId: user.sub, message } });

    // Phase 29: Notify assignee + supervisor on new comment
    try {
      const authorName = user.roles.includes('EMPLOYEE') ? 'کارشناس' : 'سرپرست';
      const targetUserIds: string[] = [];
      if (task.employeeId !== user.employeeProfileId) {
        const assignee = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId }, select: { userId: true } });
        if (assignee?.userId) targetUserIds.push(assignee.userId);
      }
      const emp = await this.prisma.employeeProfile.findUnique({ where: { id: task.employeeId }, select: { supervisorId: true } });
      if (emp?.supervisorId && emp.supervisorId !== user.employeeProfileId) {
        const sup = await this.prisma.employeeProfile.findUnique({ where: { id: emp.supervisorId }, select: { userId: true } });
        if (sup?.userId && !targetUserIds.includes(sup.userId)) targetUserIds.push(sup.userId);
      }
      await this.prisma.notification.createMany({
        data: targetUserIds.map((uid) => ({
          userId: uid,
          type: 'TASK_COMMENT',
          title: 'نظر جدید روی تسک',
          message: `نظر جدیدی روی تسک "${task.assignmentCode}" ثبت شد`,
          entityType: 'TaskAssignment',
          entityId: id,
        })),
      });
    } catch { /* ignore */ }

    return comment;
  }

  async getMyStats(user: JwtPayload) {
    const employeeId = user.employeeProfileId;
    if (!employeeId) return { total: 0, inProgress: 0, delayed: 0, needRevision: 0, todayCount: 0 };
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

    // Supervisor sees their team's stats; others see only their own
    let empFilter: any = { employeeId };
    if (user.roles.includes('SUPERVISOR')) {
      const subs = await this.prisma.employeeProfile.findMany({ where: { supervisorId: employeeId }, select: { id: true } });
      const ids = subs.map(s => s.id);
      ids.push(employeeId);
      empFilter = { employeeId: { in: ids } };
    }

    const [total, inProgress, needRevision, todayCount, all] = await Promise.all([
      this.prisma.taskAssignment.count({ where: { ...empFilter, deletedAt: null } }),
      this.prisma.taskAssignment.count({ where: { ...empFilter, status: 'IN_PROGRESS', deletedAt: null } }),
      this.prisma.taskAssignment.count({ where: { ...empFilter, status: 'NEED_REVISION', deletedAt: null } }),
      this.prisma.taskAssignment.count({ where: { ...empFilter, deadline: { gte: today, lt: tomorrow }, deletedAt: null } }),
      this.prisma.taskAssignment.findMany({ where: { ...empFilter, deletedAt: null, deadline: { not: null } } }),
    ]);
    const delayed = all.filter(t => t.deadline && new Date() > t.deadline && !['APPROVED','CANCELLED'].includes(t.status)).length;
    return { total, inProgress, delayed, needRevision, todayCount };
  }

  async update(id: string, dto: any, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    if (!this.dataScope.isAdmin(user) && !user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO')) {
      throw new ForbiddenException('فقط سرپرست یا مدیر می‌تواند تسک را ویرایش کند');
    }
    if (dto.status !== undefined) {
      throw new BadRequestException('تغییر وضعیت فقط از طریق درخواست تغییر وضعیت مجاز است');
    }

    // Phase 31: Supervisor can edit/delete only tasks they created (assignedById == self),
    // for manager-created tasks they must request revision instead.
    if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user) && !user.roles.includes('CEO')) {
      if (task.assignedById !== user.employeeProfileId) {
        throw new ForbiddenException('این تسک توسط مدیر ایجاد شده است؛ فقط می‌توانید درخواست اصلاح دهید، نه ویرایش مستقیم');
      }
    }

    const data: any = {};
    if (dto.taskTemplateId) data.taskTemplateId = dto.taskTemplateId;
    if (dto.employeeId) {
      const emp = await this.prisma.employeeProfile.findFirst({ where: { id: dto.employeeId, deletedAt: null } });
      if (!emp) throw new NotFoundException('کارمند یافت نشد');
      data.employeeId = dto.employeeId;
    }
    if (dto.projectId !== undefined) data.projectId = dto.projectId || null;
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.priority) data.priority = dto.priority;
    if (dto.notes !== undefined) data.notes = dto.notes;
    const updated = await this.prisma.taskAssignment.update({ where: { id }, data });
    await this.prisma.taskStatusHistory.create({ data: { taskAssignmentId: id, fromStatus: task.status, toStatus: dto.status || task.status, changedById: user.employeeProfileId } });
    await this.audit.logFromRequest(user, 'TASK_UPDATED', 'TaskAssignment', id, undefined, dto as any);
    return updated;
  }

  async softDelete(id: string, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    if (!this.dataScope.isAdmin(user) && !user.roles.includes('SUPERVISOR') && !user.roles.includes('CEO')) {
      throw new ForbiddenException('فقط سرپرست یا مدیر می‌تواند تسک را حذف کند');
    }
    // Phase 31: ownership check for delete
    if (user.roles.includes('SUPERVISOR') && !this.dataScope.isAdmin(user) && !user.roles.includes('CEO')) {
      if (task.assignedById !== user.employeeProfileId) {
        throw new ForbiddenException('این تسک توسط مدیر ایجاد شده است؛ فقط می‌توانید درخواست اصلاح دهید');
      }
    }
    await this.prisma.taskAssignment.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.audit.logFromRequest(user, 'TASK_DELETED', 'TaskAssignment', id);
    return { message: 'تسک حذف شد' };
  }

  async addDependency(taskId: string, dependsOn: string, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id: taskId, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    const dep = await this.prisma.taskAssignment.findFirst({ where: { id: dependsOn, deletedAt: null } });
    if (!dep) throw new NotFoundException('تسک وابسته یافت نشد');

    await this.prisma.taskDependency.upsert({
      where: { taskId_dependsOn: { taskId, dependsOn } },
      create: { taskId, dependsOn },
      update: {},
    });
    return { message: 'وابستگی ثبت شد' };
  }

  async removeDependency(taskId: string, dependsOn: string, user: JwtPayload) {
    const task = await this.prisma.taskAssignment.findFirst({ where: { id: taskId, deletedAt: null } });
    if (!task) throw new NotFoundException('تسک یافت نشد');
    await this.ensureCanAccess(task, user);
    await this.prisma.taskDependency.deleteMany({ where: { taskId, dependsOn } });
    return { message: 'وابستگی حذف شد' };
  }
}
