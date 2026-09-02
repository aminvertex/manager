import { Injectable, Logger, LoggerService } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger = new Logger('AMATIS');
  private logDir = './logs';
  private errorCountToday = 0;
  private lastAlertDate = '';

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
  }

  private writeFile(level: string, message: string, context?: string) {
    try {
      const entry = `[${new Date().toISOString()}] [${level}]${context ? ` [${context}]` : ''} ${message}\n`;
      fs.appendFileSync(path.join(this.logDir, `${level}.log`), entry);
      const stats = fs.statSync(path.join(this.logDir, `${level}.log`));
      if (stats.size > 2 * 1024 * 1024) {
        fs.renameSync(path.join(this.logDir, `${level}.log`), path.join(this.logDir, `${level}.old.log`));
      }
    } catch { /* ignore */ }
  }

  async notifyAdmins(type: string, title: string, message: string) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { isActive: true, userRoles: { some: { role: { code: { in: ['SUPER_ADMIN', 'CEO'] } } } } },
        select: { id: true },
      });
      await this.prisma.notification.createMany({
        data: admins.map((a) => ({ userId: a.id, type, title, message, entityType: 'SYSTEM' })),
      });
    } catch { /* ignore */ }
  }

  private async alertIfTooManyErrors() {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastAlertDate !== today) {
      this.lastAlertDate = today;
      this.errorCountToday = 0;
    }
    this.errorCountToday++;
    if (this.errorCountToday === 20) {
      await this.notifyAdmins('ERROR_ALERT', 'هشدار: خطاهای زیاد', `تعداد ${this.errorCountToday} خطا در سیستم ثبت شد. لطفاً بررسی کنید.`);
      this.errorCountToday = 0;
    }
  }

  log(message: any, context?: string) {
    this.logger.log(message, context);
    this.writeFile('info', String(message), context);
  }

  async error(message: any, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
    this.writeFile('error', `${String(message)}${trace ? `\n${trace}` : ''}`, context);
    await this.alertIfTooManyErrors();
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, context);
    this.writeFile('warn', String(message), context);
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, context);
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, context);
  }
}
