import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.module';
import { PasswordService } from '../common/services/password.service';
import { AuditService } from '../common/services/audit.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let passwordService: jest.Mocked<PasswordService>;

  const mockUser = {
    id: 'user-1',
    mobile: '09120000001',
    passwordHash: 'hashed',
    isActive: true,
    mustChangePassword: false,
    loginAttempts: 0,
    lockedUntil: null,
    deletedAt: null,
    userRoles: [{ role: { code: 'SUPER_ADMIN' } }],
    employeeProfile: {
      id: 'emp-1',
      employeeCode: 'EMP-0001',
      firstName: 'مدیر',
      lastName: 'سیستم',
      position: 'مدیر فنی',
      avatarUrl: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('access-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return config[key];
            }),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            compare: jest.fn(),
            hash: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    passwordService = module.get(PasswordService);
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid mobile', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ mobile: '09120000099', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.compare as jest.Mock).mockResolvedValue(false);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.login({ mobile: '09120000001', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on successful login', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (passwordService.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await service.login({
        mobile: '09120000001',
        password: 'Admin@123456',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.mobile).toBe('09120000001');
      expect(result.user.roles).toContain('SUPER_ADMIN');
    });
  });
});
