import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        success: true,
        data: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          database: 'connected',
        },
      };
    } catch {
      return {
        success: false,
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
        },
      };
    }
  }
}
