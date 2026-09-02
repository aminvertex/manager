import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '@amatis/types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CURRENT_USER_KEY = 'currentUser';
export const CurrentUser = () => {
  return (target: object, propertyKey: string | symbol, parameterIndex: number) => {
    // handled by custom param decorator below
  };
};
