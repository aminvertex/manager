import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { PasswordService } from '../common/services/password.service';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';
import { StorageService } from '../common/services/storage.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  ResetPasswordDto,
} from './dto/employee.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { normalizeMobile } from '@amatis/shared';
import { RoleCode } from '@amatis/types';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private auditService: AuditService,
    private dataScope: DataScopeService,
    private storageService: StorageService,
  ) {}

  private async generateRoleBasedCode(roleCode: string): Promise<string> {
    const settings = await this.prisma.setting.findUnique({ where: { key: 'id_patterns' } });
    const patterns = (settings?.value as any) || {};
    const rolePrefixes = patterns.rolePrefixes || {};
    const prefix = rolePrefixes[roleCode] || patterns.employeePrefix || 'STE';

    // find the next number based on existing codes with the same prefix
    const existing = await this.prisma.employeeProfile.findMany({
      where: { deletedAt: null },
      select: { employeeCode: true },
    });
    let max = 0;
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    existing.forEach((e) => {
      const m = e.employeeCode.match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  async findAll(query: EmployeeQueryDto, user: JwtPayload) {
    const { skip, take, page, limit } = getPaginationParams(query);
    const scope = this.dataScope.getEmployeeFilter(user);

    const where: Record<string, unknown> = { deletedAt: null };

    if (scope?.employeeId) {
      where.id = scope.employeeId;
    } else if (scope?.supervisorId) {
      where.OR = [
        { supervisorId: scope.supervisorId },
        { projectMembers: { some: { project: { managerId: scope.supervisorId } } } },
      ];
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { personnelCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.supervisorId) where.supervisorId = query.supervisorId;
    if (query.projectId) where.primaryProjectId = query.projectId;
    if (query.collaborationStatus)
      where.collaborationStatus = query.collaborationStatus;

    if (query.roleCode) {
      where.user = { userRoles: { some: { role: { code: query.roleCode } } } };
    }

    const [employees, total] = await Promise.all([
      this.prisma.employeeProfile.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, mobile: true, isActive: true, userRoles: { include: { role: { select: { code: true } } } } } },
          supervisor: {
            select: { id: true, firstName: true, lastName: true },
          },
          primaryProject: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.employeeProfile.count({ where }),
    ]);

    const enriched = employees.map((e: any) => ({
      ...e,
      user: {
        ...e.user,
        roles: (e.user?.userRoles || []).map((ur: any) => ur.role?.code),
      },
    }));

    return paginate(enriched, total, page, limit);
  }

  async findOne(id: string, user: JwtPayload) {
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            mobile: true,
            isActive: true,
            userRoles: { include: { role: true } },
          },
        },
        supervisor: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        primaryProject: { select: { id: true, name: true, code: true } },
        projectMembers: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('کارمند یافت نشد');
    }

    if (
      !this.dataScope.canAccessEmployee(user, employee.id, employee.supervisorId)
    ) {
      throw new ForbiddenException('دسترسی غیرمجاز');
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto, user: JwtPayload) {
    const mobile = normalizeMobile(dto.mobile);

    const existingUser = await this.prisma.user.findUnique({
      where: { mobile },
    });
    if (existingUser) {
      throw new ConflictException('این شماره موبایل قبلاً ثبت شده');
    }

    const isAdmin = this.dataScope.isAdmin(user) || user.roles.includes(RoleCode.CEO);
    if (!isAdmin) {
      dto.supervisorId = user.employeeProfileId;
      dto.roleCode = RoleCode.EMPLOYEE;
    }

    const roleCode = dto.roleCode || RoleCode.EMPLOYEE;
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      throw new NotFoundException('نقش یافت نشد');
    }

    const employeeCode = await this.generateRoleBasedCode(roleCode);

    const passwordHash = await this.passwordService.hash(dto.initialPassword);

    const result = await this.prisma.$transaction(async (tx: typeof this.prisma) => {
      const newUser = await tx.user.create({
        data: {
          mobile,
          passwordHash,
          mustChangePassword: true,
          userRoles: { create: { roleId: role.id } },
        },
      });

      const employee = await tx.employeeProfile.create({
        data: {
          userId: newUser.id,
          employeeCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          age: dto.age,
          gender: dto.gender,
          maritalStatus: dto.maritalStatus,
          personnelCode: dto.personnelCode,
          position: dto.position,
          supervisorId: dto.supervisorId || null,
          primaryProjectId: dto.primaryProjectId || null,
          collaborationType: dto.collaborationType,
          skillLevel: dto.skillLevel,
          email: dto.email,
        },
        include: {
          user: { select: { id: true, mobile: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true } },
          primaryProject: { select: { id: true, name: true, code: true } },
        },
      });

      if (dto.projectIds?.length) {
        await tx.projectMember.createMany({
          data: dto.projectIds.map((projectId) => ({
            projectId,
            employeeId: employee.id,
          })),
        });
      }

      // Project-specific supervisor role in primary project
      if (dto.isProjectSupervisor && dto.primaryProjectId) {
        await tx.projectMember.upsert({
          where: { projectId_employeeId: { projectId: dto.primaryProjectId, employeeId: employee.id } },
          create: { projectId: dto.primaryProjectId, employeeId: employee.id, role: 'SUPERVISOR' },
          update: { role: 'SUPERVISOR' },
        });
      }

      return employee;
    });

    await this.auditService.logFromRequest(
      user,
      'EMPLOYEE_CREATED',
      'EmployeeProfile',
      result.id,
      undefined,
      { employeeCode, mobile, firstName: dto.firstName, lastName: dto.lastName },
    );

    return result;
  }

  async update(id: string, dto: UpdateEmployeeDto, user: JwtPayload) {
    const employee = await this.findOne(id, user);

    const isAdmin = this.dataScope.isAdmin(user) || user.roles.includes(RoleCode.CEO);
    const isSelf = user.employeeProfileId === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('دسترسی غیرمجاز');
    }

    if (!isAdmin) {
      const allowedFields = ['email', 'age'];
      const dtoKeys = Object.keys(dto);
      const hasForbidden = dtoKeys.some((k) => !allowedFields.includes(k));
      if (hasForbidden) {
        throw new ForbiddenException('فقط برخی فیلدها قابل ویرایش هستند');
      }
    }

    const data: any = { ...dto };
    if (data.supervisorId !== undefined) data.supervisorId = data.supervisorId || null;
    if (data.primaryProjectId !== undefined) data.primaryProjectId = data.primaryProjectId || null;

    // roleCode is handled separately (changes user's role)
    if (data.roleCode !== undefined) {
      if (!this.dataScope.isAdmin(user) && !user.roles.includes(RoleCode.CEO)) {
        throw new ForbiddenException('فقط مدیر می‌تواند نقش را تغییر دهد');
      }
      const newRole = await this.prisma.role.findUnique({ where: { code: data.roleCode } });
      if (newRole) {
        await this.prisma.userRole.deleteMany({ where: { userId: employee.userId } });
        await this.prisma.userRole.create({ data: { userId: employee.userId, roleId: newRole.id } });
      }
      delete data.roleCode;
    }

    const updated = await this.prisma.employeeProfile.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, mobile: true, isActive: true } },
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        primaryProject: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.logFromRequest(
      user,
      'EMPLOYEE_UPDATED',
      'EmployeeProfile',
      id,
      { firstName: employee.firstName, lastName: employee.lastName },
      dto as Record<string, unknown>,
    );

    return updated;
  }

  async softDelete(id: string, user: JwtPayload) {
    await this.findOne(id, user);

    await this.prisma.$transaction([
      this.prisma.employeeProfile.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: (await this.prisma.employeeProfile.findUnique({ where: { id } }))!.userId },
        data: { isActive: false, deletedAt: new Date() },
      }),
    ]);

    await this.auditService.logFromRequest(
      user,
      'EMPLOYEE_DELETED',
      'EmployeeProfile',
      id,
    );

    return { message: 'کارمند با موفقیت حذف شد' };
  }

  async resetPassword(id: string, dto: ResetPasswordDto, user: JwtPayload) {
    const employee = await this.findOne(id, user);
    const passwordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: employee.userId },
      data: { passwordHash, mustChangePassword: true },
    });

    await this.auditService.logFromRequest(
      user,
      'PASSWORD_RESET',
      'User',
      employee.userId,
    );

    return { message: 'رمز عبور با موفقیت بازنشانی شد' };
  }

  async toggleActive(id: string, user: JwtPayload) {
    const employee = await this.findOne(id, user);

    const updatedUser = await this.prisma.user.update({
      where: { id: employee.userId },
      data: { isActive: !employee.user.isActive },
    });

    await this.auditService.logFromRequest(
      user,
      updatedUser.isActive ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
      'User',
      employee.userId,
    );

    return { isActive: updatedUser.isActive };
  }

  async changeRole(id: string, roleCode: string, user: JwtPayload) {
    const employee = await this.findOne(id, user);
    if (!this.dataScope.isAdmin(user) && !user.roles.includes(RoleCode.CEO)) {
      throw new ForbiddenException('فقط مدیر سیستم می‌تواند نقش را تغییر دهد');
    }
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) throw new NotFoundException('نقش یافت نشد');

    await this.prisma.userRole.deleteMany({ where: { userId: employee.userId } });
    await this.prisma.userRole.create({
      data: { userId: employee.userId, roleId: role.id },
    });

    await this.auditService.logFromRequest(user, 'EMPLOYEE_ROLE_CHANGED', 'EmployeeProfile', id, { to: roleCode });
    return { message: 'نقش با موفقیت تغییر کرد', roleCode };
  }

  async uploadAvatar(id: string, file: Express.Multer.File, user: JwtPayload) {
    const employee = await this.findOne(id, user);
    const avatarUrl = await this.storageService.uploadFile(file.path, `avatars/${file.filename}`);
    await this.prisma.employeeProfile.update({
      where: { id },
      data: { avatarUrl },
    });
    await this.auditService.logFromRequest(user, 'AVATAR_UPLOADED', 'EmployeeProfile', id);
    return { avatarUrl };
  }
}
