import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.module';
import { JwtPayload } from '../../common/decorators/get-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: {
    sub: string;
    mobile: string;
    roles: string[];
  }): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employeeProfile: { select: { id: true } },
        userRoles: { include: { role: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('کاربر غیرفعال یا یافت نشد');
    }

    return {
      sub: user.id,
      mobile: user.mobile,
      roles: user.userRoles.map((ur: { role: { code: string } }) => ur.role.code),
      employeeProfileId: user.employeeProfile?.id,
    };
  }
}
