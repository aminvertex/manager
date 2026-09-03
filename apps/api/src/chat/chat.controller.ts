import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';
import { ChatService } from './chat.service';
import { StorageService } from '../common/services/storage.service';
import { AuditService } from '../common/services/audit.service';
import * as fs from 'fs';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private service: ChatService,
    private storage: StorageService,
    private audit: AuditService,
  ) {}

  @Get('rooms')
  async listRooms(@GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.listRooms(user) };
  }

  @Get('unread-count')
  async unreadCount(@GetUser() user: JwtPayload) {
    const count = await this.service.getUnreadCount(user.sub);
    return { success: true, data: { count } };
  }

  @Post('rooms/:id/read')
  async markRead(@Param('id') id: string, @GetUser() user: JwtPayload) {
    await this.service.markRoomRead(id, user.sub);
    return { success: true };
  }

  @Get('users')
  async listUsers(@GetUser() user: JwtPayload) {
    return { success: true, data: await this.service.listUsersForChat(user) };
  }

  @Get('rooms/:id/messages')
  async getMessages(@Param('id') id: string, @GetUser() user: JwtPayload, @Query('limit') limit?: string) {
    return { success: true, data: await this.service.getMessages(id, user.sub, limit ? Number(limit) : 50) };
  }

  @Post('rooms/:id/messages')
  async sendMessage(@Param('id') id: string, @Body('content') content: string, @GetUser() user: JwtPayload) {
    const member = await this.service.isRoomMember(id, user.sub);
    if (!member) throw new Error('دسترسی مجاز نیست');
    const message = await this.service.createMessage(id, user.sub, content);
    return { success: true, data: message };
  }

  @Post('rooms/direct')
  async createDirect(@Body() body: { userId: string }, @GetUser() user: JwtPayload) {
    const room = await this.service.getOrCreateDirectRoom(user.sub, body.userId, user.sub);
    return { success: true, data: room };
  }

  @Post('rooms/project')
  async createProjectRoom(@Body() body: { projectId: string; name?: string }, @GetUser() user: JwtPayload) {
    const room = await this.service.createProjectRoom(body.projectId, body.name || 'گفتگوی پروژه', user.sub);
    return { success: true, data: room };
  }

  @Post('rooms/general')
  async createGeneralRoom(@GetUser() user: JwtPayload) {
    const room = await this.service.getOrCreateGeneralRoom();
    return { success: true, data: room };
  }

  @Post('rooms/group')
  async createGroupRoom(@Body() body: { name: string; memberIds: string[] }, @GetUser() user: JwtPayload) {
    const room = await this.service.createGroupRoom(body.name, body.memberIds || [], user.sub);
    return { success: true, data: room };
  }

  @Patch('messages/:messageId')
  async editMessage(@Param('messageId') messageId: string, @Body('content') content: string, @GetUser() user: JwtPayload) {
    const msg = await this.service.editMessage(messageId, content, user.sub);
    await this.audit.logFromRequest(user, 'CHAT_MSG_EDITED', 'ChatMessage', messageId);
    return { success: true, data: msg };
  }

  @Delete('messages/:messageId')
  async deleteMessage(@Param('messageId') messageId: string, @GetUser() user: JwtPayload) {
    await this.service.deleteMessage(messageId, user.sub);
    await this.audit.logFromRequest(user, 'CHAT_MSG_DELETED', 'ChatMessage', messageId);
    return { success: true };
  }

  @Post('messages/:messageId/pin')
  async pinMessage(@Param('messageId') messageId: string, @Body('pinned') pinned: boolean, @GetUser() user: JwtPayload) {
    const msg = await this.service.pinMessage(messageId, pinned, user.sub);
    await this.audit.logFromRequest(user, 'CHAT_MSG_PINNED', 'ChatMessage', messageId, undefined, { pinned } as any);
    return { success: true, data: msg };
  }

  @Post('rooms/:id/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = './uploads/chat';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + extname(file.originalname));
      },
    }),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'video/mp4', 'video/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4',
        'text/plain', 'text/csv',
      ];
      if (allowed.includes(file.mimetype)) return cb(null, true);
      cb(new BadRequestException('نوع فایل مجاز نیست'), false);
    },
  }))
  async uploadFile(@Param('id') roomId: string, @UploadedFile() file: Express.Multer.File, @Body('caption') caption: string, @GetUser() user: JwtPayload) {
    const member = await this.service.isRoomMember(roomId, user.sub);
    if (!member) throw new Error('دسترسی مجاز نیست');
    const url = await this.storage.uploadFile(file.path, `chat/${file.filename}`);
    const message = await this.service.createFileMessage(roomId, user.sub, {
      content: url,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      caption,
    });
    return { success: true, data: message };
  }
}
