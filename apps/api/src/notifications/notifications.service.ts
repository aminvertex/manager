import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { getPaginationParams, paginate } from '../common/utils/pagination.util';
import { NotificationQueryDto } from './dto/notification.dto';

export interface NotifyData {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: NotifyData) {
    return this.prisma.notification.create({ data });
  }

  async findAll(user: JwtPayload, query: NotificationQueryDto) {
    const { skip, take, page, limit } = getPaginationParams(query as any);
    const where: any = { userId: user.sub };
    if (query.unreadOnly === 'true') where.isRead = false;

    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId: user.sub, isRead: false } }),
    ]);
    return { ...paginate(items, total, page, limit), unreadCount: unread };
  }

  async unreadCount(user: JwtPayload) {
    const count = await this.prisma.notification.count({ where: { userId: user.sub, isRead: false } });
    return { count };
  }

  async markRead(id: string, user: JwtPayload) {
    const notif = await this.prisma.notification.findFirst({ where: { id, userId: user.sub } });
    if (!notif) throw new NotFoundException('اعلان یافت نشد');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllRead(user: JwtPayload) {
    await this.prisma.notification.updateMany({ where: { userId: user.sub, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return { message: 'همه اعلان‌ها خوانده شدند' };
  }
}
