import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleCode } from '@amatis/types';
import { PermissionService } from '../common/services/permission.service';
import * as fs from 'fs';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private permission: PermissionService) {}

  @Get('permissions')
  @Roles(RoleCode.SUPER_ADMIN)
  async getPermissions() {
    return { success: true, data: this.permission.getPermissionMap() };
  }

  @Get('logs')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.CEO)
  async getLogs() {
    const readTail = (file: string, lines: number): string[] => {
      try {
        const content = fs.readFileSync(`./logs/${file}`, 'utf8');
        const arr = content.split('\n').filter(Boolean);
        return arr.slice(-lines);
      } catch {
        return [];
      }
    };
    return {
      success: true,
      data: {
        info: readTail('info.log', 50),
        error: readTail('error.log', 50),
        warn: readTail('warn.log', 50),
      },
    };
  }
}
