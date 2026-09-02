import { Controller, Get, Patch, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@GetUser() user: JwtPayload, @Query() query: NotificationQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get('unread-count')
  unreadCount(@GetUser() user: JwtPayload) {
    return this.service.unreadCount(user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @GetUser() user: JwtPayload) {
    return this.service.markRead(id, user);
  }

  @Patch('read-all')
  markAllRead(@GetUser() user: JwtPayload) {
    return this.service.markAllRead(user);
  }
}
