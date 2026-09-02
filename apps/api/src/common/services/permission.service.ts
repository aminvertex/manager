import { Injectable } from '@nestjs/common';
import { RoleCode } from '@amatis/types';
import { JwtPayload } from '../decorators/get-user.decorator';

// Granular permission map (Phase 68)
// Each permission lists roles that are allowed.
export const PERMISSION_ROLES: Record<string, RoleCode[]> = {
  canCreateProject: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canDeleteProject: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canEditProject: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canToggleProject: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canManageMembers: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canCreateTask: [RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER, RoleCode.TECH_COMMITTEE_MEMBER],
  canEditTask: [RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER],
  canDeleteTask: [RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER],
  canApproveTask: [RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER, RoleCode.TECH_COMMITTEE_MEMBER],
  canEvaluate: [RoleCode.SUPER_ADMIN, RoleCode.SUPERVISOR, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER],
  canManageTraining: [RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.SUPERVISOR, RoleCode.TECH_COMMITTEE_MANAGER],
  canViewAuditLogs: [RoleCode.SUPER_ADMIN],
  canManageSettings: [RoleCode.SUPER_ADMIN],
  canManageChat: [RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER],
  canCreateEmployee: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canChangeRole: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canResetPassword: [RoleCode.SUPER_ADMIN, RoleCode.CEO],
  canManageCertificates: [RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER],
  canRetakeExam: [RoleCode.SUPER_ADMIN, RoleCode.CEO, RoleCode.TECH_COMMITTEE_MANAGER, RoleCode.SUPERVISOR],
};

@Injectable()
export class PermissionService {
  can(user: JwtPayload, permission: string): boolean {
    const allowed = PERMISSION_ROLES[permission];
    if (!allowed) return false;
    return (user.roles as RoleCode[]).some((r) => allowed.includes(r));
  }

  canAny(user: JwtPayload, permissions: string[]): boolean {
    return permissions.some((p) => this.can(user, p));
  }

  // Export the map for API consumers
  getPermissionMap(): Record<string, RoleCode[]> {
    return PERMISSION_ROLES;
  }
}
