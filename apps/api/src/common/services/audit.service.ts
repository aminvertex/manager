import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { JwtPayload } from '../decorators/get-user.decorator';

export interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue as Prisma.InputJsonValue | undefined,
        newValue: data.newValue as Prisma.InputJsonValue | undefined,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async logFromRequest(
    user: JwtPayload,
    action: string,
    entityType: string,
    entityId?: string,
    oldValue?: Record<string, unknown>,
    newValue?: Record<string, unknown>,
    req?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      userId: user.sub,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  }
}
