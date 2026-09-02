import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';
import { DataScopeService } from '../common/services/data-scope.service';

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaService,
    private dataScope: DataScopeService,
  ) {}

  private periodKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  async monthlyReport(period: string, user: JwtPayload) {
    const [year, month] = period.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const employees = await this.prisma.employeeProfile.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { userRoles: { include: { role: { select: { code: true } } } } } },
        taskAssignments: { where: { deletedAt: null, createdAt: { gte: start, lt: end } }, select: { status: true, revisionCount: true, deadline: true, completionTime: true } },
        evaluations: { where: { evaluatedAt: { gte: start, lt: end } }, select: { score100: true } },
        kpis: { where: { period }, select: { finalScore: true, classification: true } },
      },
    });

    const rows = employees
      .filter((e) => this.dataScope.canAccessEmployee(user, e.id, (e as any).supervisorId))
      .map((e) => {
        const tasks = e.taskAssignments || [];
        const completed = tasks.filter((t) => t.status === 'APPROVED').length;
        const delayed = tasks.filter((t) => t.status === 'DELAYED').length;
        const revisions = tasks.reduce((s, t) => s + t.revisionCount, 0);
        const quality = e.evaluations?.filter((ev) => ev.score100 != null).map((ev) => ev.score100 as number) || [];
        const kpi = e.kpis?.[0]?.finalScore;
        return {
          employeeCode: e.employeeCode,
          name: `${e.firstName} ${e.lastName}`,
          position: e.position || '',
          role: e.user?.userRoles?.[0]?.role?.code || '',
          totalTasks: tasks.length,
          completed,
          delayed,
          revisionCount: revisions,
          completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
          avgQuality: quality.length ? Math.round(quality.reduce((s, q) => s + q, 0) / quality.length) : null,
          kpi,
        };
      });

    return { period, generatedAt: new Date().toISOString(), rows };
  }

  async projectReport(projectId: string, user: JwtPayload) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } } } },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    const tasks = await this.prisma.taskAssignment.findMany({
      where: { projectId, deletedAt: null },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });

    const now = new Date();
    const members = project.members.map((m) => {
      const t = tasks.filter((x) => x.employeeId === m.employeeId);
      return {
        name: `${m.employee.firstName} ${m.employee.lastName}`,
        employeeCode: m.employee.employeeCode,
        tasks: t.length,
        completed: t.filter((x) => x.status === 'APPROVED').length,
        inProgress: t.filter((x) => ['IN_PROGRESS', 'SUBMITTED', 'NEED_REVISION'].includes(x.status)).length,
        delayed: t.filter((x) => x.status === 'DELAYED' || (x.deadline && x.status !== 'APPROVED' && x.status !== 'CANCELLED' && new Date(x.deadline) < now)).length,
      };
    });

    const completedTasks = tasks.filter((t) => t.status === 'APPROVED').length;
    return {
      project: { name: project.name, code: project.code },
      totalTasks: tasks.length,
      completedTasks,
      progress: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
      members,
      generatedAt: new Date().toISOString(),
    };
  }

  async supervisorTeamReport(user: JwtPayload) {
    const subordinates = await this.prisma.employeeProfile.findMany({
      where: { supervisorId: user.employeeProfileId, deletedAt: null },
      include: {
        taskAssignments: { where: { deletedAt: null }, select: { status: true, revisionCount: true } },
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      members: subordinates.map((e) => {
        const tasks = e.taskAssignments || [];
        const completed = tasks.filter((t) => t.status === 'APPROVED').length;
        return {
          name: `${e.firstName} ${e.lastName}`,
          employeeCode: e.employeeCode,
          position: e.position || '',
          totalTasks: tasks.length,
          completed,
          delayed: tasks.filter((t) => t.status === 'DELAYED').length,
          revisionCount: tasks.reduce((s, t) => s + t.revisionCount, 0),
          completionRate: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
        };
      }),
    };
  }
}
