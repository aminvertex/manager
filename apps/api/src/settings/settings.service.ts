import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
import { JwtPayload } from '../common/decorators/get-user.decorator';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async findByKey(key: string) {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  async upsert(
    key: string,
    value: unknown,
    category: string,
    label?: string,
    user?: JwtPayload,
  ) {
    const old = await this.prisma.setting.findUnique({ where: { key } });

    const setting = await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: value as object, category, label },
      update: { value: value as object, label },
    });

    if (user) {
      await this.auditService.logFromRequest(
        user,
        'SETTING_UPDATED',
        'Setting',
        key,
        old ? { value: old.value } : undefined,
        { value },
      );
    }

    return setting;
  }

  async getCategories() {
    const setting = await this.findByKey('task_categories');
    return setting?.value || [];
  }

  async getPriorities() {
    const setting = await this.findByKey('priorities');
    return setting?.value || [];
  }

  async getKpiWeights() {
    const setting = await this.findByKey('kpi_weights');
    return setting?.value || {};
  }

  async getPerformanceClassifications() {
    const setting = await this.findByKey('performance_classifications');
    return setting?.value || [];
  }

  async getIdPatterns(): Promise<{ employeePrefix: string; projectPrefix: string; rolePrefixes: Record<string, string> }> {
    const setting = await this.findByKey('id_patterns');
    const val = (setting?.value || {}) as any;
    return {
      employeePrefix: val.employeePrefix || 'STE',
      projectPrefix: val.projectPrefix || 'PRJ',
      rolePrefixes: val.rolePrefixes || {},
    };
  }

  async saveIdPatterns(patterns: { employeePrefix?: string; projectPrefix?: string; rolePrefixes?: Record<string, string>; applyToExisting?: boolean }) {
    const current = await this.getIdPatterns();
    const merged = {
      employeePrefix: patterns.employeePrefix?.trim() || current.employeePrefix || 'STE',
      projectPrefix: patterns.projectPrefix?.trim() || current.projectPrefix || 'PRJ',
      rolePrefixes: patterns.rolePrefixes || current.rolePrefixes || {},
    };
    const setting = await this.prisma.setting.upsert({
      where: { key: 'id_patterns' },
      create: { key: 'id_patterns', value: merged as any, category: 'general', label: 'الگوی شناسه‌ها' },
      update: { value: merged as any, label: 'الگوی شناسه‌ها' },
    });
    return { setting, applyToExisting: !!patterns.applyToExisting };
  }

  async regenerateExistingIds() {
    const patterns = await this.getIdPatterns();
    const employees = await this.prisma.employeeProfile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, employeeCode: true, userId: true },
    });
    const projects = await this.prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, code: true },
    });

    // fetch roles per employee
    const roleUsers = await this.prisma.userRole.findMany({
      where: { userId: { in: employees.map((e) => e.userId) } },
      select: { userId: true, role: { select: { code: true } } },
    });
    const roleMap: Record<string, string> = {};
    roleUsers.forEach((r) => { if (!roleMap[r.userId]) roleMap[r.userId] = r.role.code; });

    // per-role counters
    const roleCounters: Record<string, number> = {};
    let globalCounter = 1, prj = 1;

    for (const e of employees) {
      const role = roleMap[e.userId] || 'EMPLOYEE';
      const prefix = patterns.rolePrefixes?.[role] || patterns.employeePrefix || 'STE';
      if (!roleCounters[prefix]) roleCounters[prefix] = 1;
      await this.prisma.employeeProfile.update({
        where: { id: e.id },
        data: { employeeCode: `${prefix}-${String(roleCounters[prefix]).padStart(3, '0')}` },
      });
      roleCounters[prefix]++;
      globalCounter++;
    }
    for (const p of projects) {
      await this.prisma.project.update({
        where: { id: p.id },
        data: { code: `${patterns.projectPrefix}-${String(prj).padStart(3, '0')}` },
      });
      prj++;
    }
    return { employees: employees.length, projects: projects.length };
  }
}
