import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { PasswordService } from '../common/services/password.service';
import { AuditService } from '../common/services/audit.service';
import { normalizeMobile } from '@amatis/shared';
import { LoginDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtPayload } from '../common/decorators/get-user.decorator';

@Injectable()
export class AuthService {
  private readonly maxAttempts: number;
  private readonly lockDurationMinutes: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private passwordService: PasswordService,
    private auditService: AuditService,
  ) {
    this.maxAttempts = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10);
    this.lockDurationMinutes = parseInt(
      process.env.LOGIN_LOCK_DURATION_MINUTES || '15',
      10,
    );
  }

  async login(dto: LoginDto, ip?: string) {
    const mobile = normalizeMobile(dto.mobile);

    const user = await this.prisma.user.findUnique({
      where: { mobile },
      include: {
        userRoles: { include: { role: true } },
        employeeProfile: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            position: true,
            avatarUrl: true,
            email: true,
            age: true,
            skillLevel: true,
            collaborationType: true,
            collaborationStatus: true,
            gender: true,
            maritalStatus: true,
            startDate: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('شماره موبایل یا رمز عبور اشتباه است');
    }

    if (!user.isActive) {
      throw new ForbiddenException('حساب کاربری غیرفعال است');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `حساب به دلیل تلاش‌های ناموفق قفل شده. ${minutesLeft} دقیقه دیگر تلاش کنید.`,
      );
    }

    const isValid = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isValid) {
      const attempts = user.loginAttempts + 1;
      const updateData: { loginAttempts: number; lockedUntil?: Date } = {
        loginAttempts: attempts,
      };

      if (attempts >= this.maxAttempts) {
        updateData.lockedUntil = new Date(
          Date.now() + this.lockDurationMinutes * 60 * 1000,
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('شماره موبایل یا رمز عبور اشتباه است');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user.id, mobile, user.userRoles);

    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        mobile: user.mobile,
        roles: user.userRoles.map((ur: { role: { code: string } }) => ur.role.code),
        mustChangePassword: user.mustChangePassword,
        employeeProfile: user.employeeProfile,
      },
    };
  }

  async refreshToken(token: string) {
    const tokenHash = this.hashToken(token);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            userRoles: { include: { role: true } },
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('توکن نامعتبر یا منقضی شده');
    }

    if (!stored.user.isActive) {
      throw new ForbiddenException('حساب کاربری غیرفعال است');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(
      stored.user.id,
      stored.user.mobile,
      stored.user.userRoles,
    );
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { revokedAt: new Date() },
      });
    }

    await this.auditService.log({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.log({
      userId,
      action: 'LOGOUT_ALL',
      entityType: 'User',
      entityId: userId,
    });
  }

  async changePassword(user: JwtPayload, dto: ChangePasswordDto) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
    });

    if (!dbUser) {
      throw new UnauthorizedException();
    }

    const isValid = await this.passwordService.compare(
      dto.currentPassword,
      dbUser.passwordHash,
    );

    if (!isValid) {
      throw new BadRequestException('رمز عبور فعلی اشتباه است');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.sub },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.auditService.log({
      userId: user.sub,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user.sub,
    });

    return { message: 'رمز عبور با موفقیت تغییر کرد' };
  }

  async getMe(user: JwtPayload) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        userRoles: { include: { role: true } },
        employeeProfile: {
          include: {
            primaryProject: { select: { id: true, name: true, code: true } },
            supervisor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException();
    }

    return {
      id: dbUser.id,
      mobile: dbUser.mobile,
      roles: dbUser.userRoles.map((ur: { role: { code: string } }) => ur.role.code),
      mustChangePassword: dbUser.mustChangePassword,
      employeeProfile: dbUser.employeeProfile,
    };
  }

  private async generateTokens(
    userId: string,
    mobile: string,
    userRoles: Array<{ role: { code: string } }>,
  ) {
    const roles = userRoles.map((ur) => ur.role.code);

    const payload = { sub: userId, mobile, roles };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = new Date();
    const days = parseInt(expiresIn.replace('d', ''), 10) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
