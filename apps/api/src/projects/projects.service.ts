import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectQueryDto,
} from './dto/project.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';
import { RoleCode } from '@amatis/types';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private dataScope: DataScopeService,
  ) {}

  private async ensureProjectChat(projectId: string, name: string, actorId: string) {
    const existing = await this.prisma.chatRoom.findFirst({
      where: { type: 'PROJECT', projectId },
    });
    if (existing) return existing;
    return this.prisma.chatRoom.create({
      data: { type: 'PROJECT', name, projectId, createdBy: actorId },
    });
  }

  private async generateProjectCode(): Promise<string> {
    const settings = await this.prisma.setting.findUnique({ where: { key: 'id_patterns' } });
    const patterns = (settings?.value as any) || {};
    const prefix = patterns.projectPrefix || 'PRJ';
    const last = await this.prisma.project.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });
    let num = 1;
    if (last?.code) {
      const match = last.code.match(/(\d+)$/);
      if (match) num = parseInt(match[1], 10) + 1;
    }
    return `${prefix}-${String(num).padStart(3, '0')}`;
  }

  private async canManageProject(projectId: string, user: JwtPayload) {
    if (this.dataScope.isAdmin(user) || user.roles.includes(RoleCode.CEO) || user.roles.includes(RoleCode.TECH_COMMITTEE_MANAGER)) return;
    if (user.roles.includes(RoleCode.SUPERVISOR)) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundException('پروژه یافت نشد');
      // supervisor can manage if managerId is themselves OR they manage a member
      if (project.managerId === user.employeeProfileId) return;
      const members = await this.prisma.projectMember.findMany({ where: { projectId } });
      const memberIds = members.map((m) => m.employeeId);
      const subordinates = await this.prisma.employeeProfile.findMany({
        where: { id: { in: memberIds }, supervisorId: user.employeeProfileId },
      });
      if (subordinates.length > 0) return;
      throw new ForbiddenException('شما مدیریت این پروژه را ندارید');
    }
    throw new ForbiddenException('دسترسی غیرمجاز');
  }

  async findAll(query: ProjectQueryDto, user?: JwtPayload) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;

    if (user && !this.dataScope.isAdmin(user) && !user.roles.includes(RoleCode.CEO) && !user.roles.includes(RoleCode.TECH_COMMITTEE_MANAGER)) {
      if (user.roles.includes(RoleCode.SUPERVISOR)) {
        const memberProjectIds = await this.prisma.projectMember.findMany({
          where: { employeeId: user.employeeProfileId },
          select: { projectId: true },
        });
        const memberIds = memberProjectIds.map((m) => m.projectId);
        const subordinateIds = await this.prisma.employeeProfile.findMany({
          where: { supervisorId: user.employeeProfileId },
          select: { id: true },
        });
        const subProjectIds = await this.prisma.projectMember.findMany({
          where: { employeeId: { in: subordinateIds.map((s) => s.id) } },
          select: { projectId: true },
        });
        const ids = Array.from(new Set([...memberIds, ...subProjectIds.map((m) => m.projectId)]));
        const orClauses: any[] = [];
        if (ids.length > 0) orClauses.push({ id: { in: ids } });
        orClauses.push({ managerId: user.employeeProfileId });
        where.OR = [...(Array.isArray(where.OR) ? where.OR : []), ...orClauses];
      } else if (user.roles.includes(RoleCode.EMPLOYEE) || user.roles.includes(RoleCode.EXPERT_L1) || user.roles.includes(RoleCode.EXPERT_L2) || user.roles.includes(RoleCode.EXPERT_L3) || user.roles.includes(RoleCode.SALES_CONSULTANT) || user.roles.includes(RoleCode.TECH_COMMITTEE_MEMBER) || user.roles.includes(RoleCode.TECH_COMMITTEE_MANAGER)) {
        const memberProjectIds = await this.prisma.projectMember.findMany({
          where: { employeeId: user.employeeProfileId },
          select: { projectId: true },
        });
        const orClauses: any[] = [{ primaryEmployees: { some: { id: user.employeeProfileId } } }];
        if (memberProjectIds.length > 0) orClauses.push({ id: { in: memberProjectIds.map((m) => m.projectId) } });
        where.OR = [...(Array.isArray(where.OR) ? where.OR : []), ...orClauses];
      }
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { members: true, primaryEmployees: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return paginate(projects, total, page, limit);
  }

  async findOne(id: string) {
    const manager = await this.prisma.project.findUnique({
      where: { id },
      select: { managerId: true },
    });
    if (manager?.managerId) {
      await this.prisma.projectMember.upsert({
        where: { projectId_employeeId: { projectId: id, employeeId: manager.managerId } },
        create: { projectId: id, employeeId: manager.managerId, role: 'PROJECT_SUPERVISOR' },
        update: { role: 'PROJECT_SUPERVISOR' },
      });
    }
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        members: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
        _count: { select: { primaryEmployees: true } },
      },
    });

    if (!project) throw new NotFoundException('پروژه یافت نشد');
    return project;
  }

  async create(dto: CreateProjectDto, user: JwtPayload) {
    const code = await this.generateProjectCode();
    const existing = await this.prisma.project.findUnique({
      where: { code },
    });
    if (existing) throw new ConflictException('کد پروژه تکراری است');

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        code,
        description: dto.description,
        managerId: dto.managerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });

    if (dto.managerId) {
      await this.prisma.projectMember.upsert({
        where: { projectId_employeeId: { projectId: project.id, employeeId: dto.managerId } },
        create: { projectId: project.id, employeeId: dto.managerId, role: 'PROJECT_SUPERVISOR' },
        update: { role: 'PROJECT_SUPERVISOR' },
      });
    }
    await this.ensureProjectChat(project.id, project.name, user.sub);

    await this.auditService.logFromRequest(
      user,
      'PROJECT_CREATED',
      'Project',
      project.id,
      undefined,
      { name: dto.name, code: dto.code },
    );

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: JwtPayload) {
    await this.findOne(id);
    await this.canManageProject(id, user);

    const project = await this.prisma.project.update({
      where: { id },
      data: dto,
    });

    if (dto.managerId) {
      await this.prisma.projectMember.upsert({
        where: { projectId_employeeId: { projectId: id, employeeId: dto.managerId } },
        create: { projectId: id, employeeId: dto.managerId, role: 'PROJECT_SUPERVISOR' },
        update: { role: 'PROJECT_SUPERVISOR' },
      });
    }

    await this.auditService.logFromRequest(
      user,
      'PROJECT_UPDATED',
      'Project',
      id,
      undefined,
      dto as Record<string, unknown>,
    );

    return project;
  }

  async softDelete(id: string, user: JwtPayload) {
    await this.findOne(id);
    await this.canManageProject(id, user);

    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.auditService.logFromRequest(
      user,
      'PROJECT_DELETED',
      'Project',
      id,
    );

    return { message: 'پروژه با موفقیت حذف شد' };
  }

  async toggleActive(id: string, user: JwtPayload) {
    await this.findOne(id);
    await this.canManageProject(id, user);
    const project = await this.prisma.project.findUnique({ where: { id } });
    const updated = await this.prisma.project.update({
      where: { id },
      data: { isActive: !project?.isActive },
    });
    await this.auditService.logFromRequest(user, 'PROJECT_TOGGLED', 'Project', id);
    return { isActive: updated.isActive };
  }

  async updateLogo(id: string, logoUrl: string, user: JwtPayload) {
    await this.findOne(id);
    await this.canManageProject(id, user);
    const updated = await this.prisma.project.update({ where: { id }, data: { logoUrl } });
    await this.auditService.logFromRequest(user, 'PROJECT_LOGO_UPDATED', 'Project', id);
    return { logoUrl: updated.logoUrl };
  }

  // Check if project is locked for non-admin operations
  async ensureUnlocked(id: string, user: JwtPayload) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('پروژه یافت نشد');
    if (!project.isActive && !this.dataScope.isAdmin(user) && !user.roles.includes(RoleCode.CEO)) {
      throw new ForbiddenException('این پروژه قفل است و فقط مدیر فنی/مدیرعامل می‌تواند آن را تغییر دهد');
    }
    return project;
  }

  async addMember(id: string, employeeId: string, user: JwtPayload) {
    await this.findOne(id);
    await this.canManageProject(id, user);
    const employee = await this.prisma.employeeProfile.findFirst({ where: { id: employeeId, deletedAt: null } });
    if (!employee) throw new NotFoundException('کارمند یافت نشد');

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_employeeId: { projectId: id, employeeId } },
    });
    if (existing) throw new ConflictException('کارمند قبلاً عضو این پروژه است');

    const member = await this.prisma.projectMember.create({
      data: { projectId: id, employeeId },
      include: { employee: { select: { id: true, firstName: true, lastName: true, userId: true } } },
    });

    // Phase 57/58: ensure project chat room exists, add member + system message
    try {
      const project = await this.prisma.project.findUnique({ where: { id }, select: { name: true } });
      const room = await this.ensureProjectChat(id, project?.name || 'پروژه', user.employeeProfileId || 'system');
      await this.prisma.chatRoomMember.upsert({
        where: { roomId_userId: { roomId: room.id, userId: member.employee.userId } },
        create: { roomId: room.id, userId: member.employee.userId },
        update: {},
      });
      await this.prisma.chatMessage.create({
        data: {
          roomId: room.id,
          senderId: user.sub,
          type: 'SYSTEM',
          content: `${member.employee.firstName} ${member.employee.lastName} به این پروژه اضافه شد`,
        },
      });
    } catch { /* ignore */ }

    await this.auditService.logFromRequest(user, 'PROJECT_MEMBER_ADDED', 'ProjectMember', member.id);
    return member;
  }

  async removeMember(id: string, employeeId: string, user: JwtPayload) {
    await this.findOne(id);
    await this.canManageProject(id, user);
    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_employeeId: { projectId: id, employeeId } },
    });
    if (!existing) throw new NotFoundException('کارمند عضو این پروژه نیست');
    await this.prisma.projectMember.delete({ where: { id: existing.id } });
    await this.auditService.logFromRequest(user, 'PROJECT_MEMBER_REMOVED', 'ProjectMember', existing.id);
    return { message: 'کارمند از پروژه حذف شد' };
  }

  async getReport(id: string, user: JwtPayload) {
    const project = await this.findOne(id);
    await this.canAccessProject(id, user);

    const tasks = await this.prisma.taskAssignment.findMany({
      where: { projectId: id, deletedAt: null },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    const members = project.members.map((m) => ({
      id: m.employee.id,
      firstName: m.employee.firstName,
      lastName: m.employee.lastName,
      employeeCode: m.employee.employeeCode,
      tasks: 0,
      completed: 0,
      inProgress: 0,
      delayed: 0,
      pending: 0,
      kpi: null as number | null,
    }));

    const now = new Date();
    for (const task of tasks) {
      const member = members.find((m) => m.id === task.employeeId);
      if (!member) continue;
      member.tasks += 1;
      if (task.status === 'APPROVED') member.completed += 1;
      else if (['IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'NEED_REVISION', 'RESUBMITTED'].includes(task.status)) member.inProgress += 1;
      else member.pending += 1;
      const isDelayed = task.deadline && task.status !== 'APPROVED' && task.status !== 'CANCELLED' && new Date(task.deadline) < now;
      if (isDelayed) member.delayed += 1;
    }

    const completedTasks = tasks.filter((t) => t.status === 'APPROVED').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    const performanceEvaluations = await this.prisma.performanceEvaluation.findMany({
      where: { projectId: id },
    });
    for (const member of members) {
      const evals = performanceEvaluations.filter((e) => e.employeeId === member.id && e.score != null);
      if (evals.length > 0) {
        member.kpi = Math.round(evals.reduce((s, e) => s + (e.score as number), 0) / evals.length);
      }
    }

    const kpis = await this.prisma.employeeKPI.findMany({
      where: { employeeId: { in: members.map((m) => m.id) }, period: new Date().toISOString().slice(0, 7) },
    });
    for (const member of members) {
      const kpi = kpis.find((k) => k.employeeId === member.id);
      if (kpi && kpi.finalScore != null && member.kpi == null) member.kpi = Math.round(kpi.finalScore);
    }

    return {
      project,
      totalTasks: tasks.length,
      completedTasks,
      inProgressTasks: tasks.filter((t) => ['IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'NEED_REVISION', 'RESUBMITTED'].includes(t.status)).length,
      delayedTasks: tasks.filter((t) => t.deadline && t.status !== 'APPROVED' && t.status !== 'CANCELLED' && new Date(t.deadline) < now).length,
      progress,
      members,
    };
  }

  private async canAccessProject(id: string, user: JwtPayload) {
    if (
      this.dataScope.isAdmin(user) ||
      user.roles.includes(RoleCode.CEO) ||
      user.roles.includes(RoleCode.TECH_COMMITTEE_MANAGER)
    ) return;
    const isMember = await this.prisma.projectMember.findFirst({
      where: { projectId: id, employeeId: user.employeeProfileId },
    });
    if (isMember) return;
    if (user.roles.includes(RoleCode.SUPERVISOR)) {
      const project = await this.prisma.project.findUnique({ where: { id } });
      if (project?.managerId === user.employeeProfileId) return;
      const members = await this.prisma.projectMember.findMany({ where: { projectId: id } });
      const memberIds = members.map((m) => m.employeeId);
      const subordinate = await this.prisma.employeeProfile.findFirst({
        where: { id: { in: memberIds }, supervisorId: user.employeeProfileId },
      });
      if (subordinate) return;
      throw new ForbiddenException('دسترسی به گزارش این پروژه مجاز نیست');
    }
    throw new ForbiddenException('دسترسی غیرمجاز');
  }
}
