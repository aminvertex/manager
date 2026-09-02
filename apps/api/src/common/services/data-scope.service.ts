import { Injectable } from '@nestjs/common';
import { RoleCode } from '@amatis/types';
import { JwtPayload } from '../decorators/get-user.decorator';

export interface DataScopeFilter {
  employeeId?: string;
  supervisorId?: string;
}

// Admin/CEO = full access (مدیر فنی + مدیرعامل)
const ADMIN_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.CEO];
// Manager-like = see team scope
const MANAGER_ROLES = [RoleCode.SUPERVISOR];
// Expert/employee-equivalent roles (کارشناس + همه نقش‌های کارشناسی)
const EXPERT_ROLES = [
  RoleCode.EMPLOYEE,
  RoleCode.EXPERT_L1,
  RoleCode.EXPERT_L2,
  RoleCode.EXPERT_L3,
  RoleCode.TECH_COMMITTEE_MEMBER,
  RoleCode.TECH_COMMITTEE_MANAGER,
  RoleCode.SALES_CONSULTANT,
];

@Injectable()
export class DataScopeService {
  getEmployeeFilter(user: JwtPayload): DataScopeFilter | null {
    const roles = user.roles as RoleCode[];

    if (roles.some((r) => ADMIN_ROLES.includes(r))) {
      return null; // see all
    }

    if (roles.some((r) => MANAGER_ROLES.includes(r))) {
      return { supervisorId: user.employeeProfileId };
    }

    if (roles.some((r) => EXPERT_ROLES.includes(r))) {
      return { employeeId: user.employeeProfileId };
    }

    return { employeeId: 'none' }; // deny by default
  }

  canAccessEmployee(
    user: JwtPayload,
    targetEmployeeId: string,
    targetSupervisorId?: string | null,
  ): boolean {
    const roles = user.roles as RoleCode[];

    if (roles.some((r) => ADMIN_ROLES.includes(r))) {
      return true;
    }

    if (roles.some((r) => MANAGER_ROLES.includes(r))) {
      return (
        targetSupervisorId === user.employeeProfileId ||
        targetEmployeeId === user.employeeProfileId
      );
    }

    if (roles.some((r) => EXPERT_ROLES.includes(r))) {
      return targetEmployeeId === user.employeeProfileId;
    }

    return false;
  }

  isAdmin(user: JwtPayload): boolean {
    return (user.roles as RoleCode[]).includes(RoleCode.SUPER_ADMIN);
  }

  isManager(user: JwtPayload): boolean {
    const roles = user.roles as RoleCode[];
    return roles.some((r) => ADMIN_ROLES.includes(r) || MANAGER_ROLES.includes(r));
  }

  isReadOnly(user: JwtPayload): boolean {
    return (user.roles as RoleCode[]).includes(RoleCode.CEO);
  }

  isExpert(user: JwtPayload): boolean {
    const roles = user.roles as RoleCode[];
    return roles.some((r) => EXPERT_ROLES.includes(r));
  }
}
