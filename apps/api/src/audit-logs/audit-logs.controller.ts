import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoleCode } from '@amatis/types';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';

class AuditLogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'لیست لاگ‌های حسابرسی' })
  async findAll(@Query() query: AuditLogQueryDto) {
    const { skip, take, page, limit } = getPaginationParams(query);

    const where: Record<string, unknown> = {};
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.userId) where.userId = query.userId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              mobile: true,
              employeeProfile: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const result = paginate(logs, total, page, limit);
    return { success: true, ...result };
  }
}
