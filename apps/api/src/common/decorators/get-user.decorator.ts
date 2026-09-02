import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  mobile: string;
  roles: string[];
  employeeProfileId?: string;
}

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
