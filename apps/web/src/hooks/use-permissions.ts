'use client';

import { useAuth } from '@/lib/auth-context';
import { RoleCode } from '@amatis/types';

// Mirror of backend PERMISSION_ROLES (Phase 68)
const PERMISSION_ROLES: Record<string, RoleCode[]> = {
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

export function usePermissions() {
  const { user, hasRole } = useAuth();
  const roles = user?.roles || [];

  const can = (permission: string): boolean => {
    const allowed = PERMISSION_ROLES[permission];
    if (!allowed) return false;
    return roles.some((r) => allowed.includes(r as RoleCode));
  };

  return { can, hasRole };
}
