import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { JwtPayload } from '../common/decorators/get-user.decorator';
import { RoleCode } from '@amatis/types';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async isRoomMember(roomId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.chatRoomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return !!member;
  }

  async getOrCreateDirectRoom(userA: string, userB: string, creatorId: string) {    const [a, b] = [userA, userB].sort();
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        type: 'DIRECT',
        members: { every: { userId: { in: [a, b] } } },
      },
    });
    if (existing) return existing;

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.chatRoom.create({
        data: { type: 'DIRECT', name: 'direct', createdBy: creatorId },
      });
      await tx.chatRoomMember.createMany({
        data: [a, b].map((uid) => ({ roomId: room.id, userId: uid })),
      });
      return room;
    });
  }

  async getOrCreateGeneralRoom() {
    const existing = await this.prisma.chatRoom.findFirst({
      where: { type: 'GENERAL' },
    });
    if (existing) return existing;
    const room = await this.prisma.chatRoom.create({
      data: { type: 'GENERAL', name: 'گفتگوی عمومی سازمان' },
    });
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    await this.prisma.chatRoomMember.createMany({
      data: users.map((u) => ({ roomId: room.id, userId: u.id })),
    });
    return room;
  }

  async createProjectRoom(projectId: string, name: string, creatorId: string) {
    const existing = await this.prisma.chatRoom.findFirst({
      where: { type: 'PROJECT', projectId },
    });
    if (existing) {
      // ensure creator is a member even if room already exists
      const isMember = await this.prisma.chatRoomMember.findUnique({
        where: { roomId_userId: { roomId: existing.id, userId: creatorId } },
      });
      if (!isMember) {
        await this.prisma.chatRoomMember.create({ data: { roomId: existing.id, userId: creatorId } });
      }
      return existing;
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { select: { employee: { select: { userId: true } } } } },
    });
    if (!project) throw new NotFoundException('پروژه یافت نشد');

    const room = await this.prisma.chatRoom.create({
      data: { type: 'PROJECT', name, projectId, createdBy: creatorId },
    });

    const userIds = new Set<string>([creatorId]);
    if (project.managerId) {
      const mgr = await this.prisma.employeeProfile.findUnique({ where: { id: project.managerId }, select: { userId: true } });
      if (mgr) userIds.add(mgr.userId);
    }
    for (const m of project.members) {
      if (m.employee?.userId) userIds.add(m.employee.userId);
    }

    await this.prisma.chatRoomMember.createMany({
      data: Array.from(userIds).map((uid) => ({ roomId: room.id, userId: uid })),
      skipDuplicates: true,
    });
    return room;
  }

  async listRooms(user: JwtPayload) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { members: { some: { userId: user.sub } } },
      include: {
        project: { select: { id: true, name: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                mobile: true,
                employeeProfile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, position: true } },
              },
            },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true, senderId: true } },
        _count: {
          select: { messages: { where: { senderId: { not: user.sub }, readAt: null } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rooms.map((room) => {
      const last = room.messages[0];
      const others = room.members.map((m) => m.user).filter((u: any) => u.id !== user.sub);
      const name =
        room.type === 'DIRECT' ? (others[0]?.employeeProfile ? `${others[0].employeeProfile.firstName} ${others[0].employeeProfile.lastName}` : 'چت') : room.name;
      return {
        id: room.id,
        type: room.type,
        name,
        project: room.project,
        members: room.members.map((m) => m.user),
        unread: room._count?.messages || 0,
        lastMessage: last ? { content: last.content, createdAt: last.createdAt, senderId: last.senderId } : null,
      };
    });
  }

  async getMessages(roomId: string, userId: string, limit = 50) {
    const member = await this.isRoomMember(roomId, userId);
    if (!member) throw new ForbiddenException('دسترسی به این گفتگو مجاز نیست');
    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            mobile: true,
            employeeProfile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
    return messages.reverse();
  }

  async createMessage(roomId: string, senderId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: { roomId, senderId, content },
      include: {
        sender: {
          select: {
            id: true,
            mobile: true,
            employeeProfile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async createFileMessage(roomId: string, senderId: string, fileInfo: { content: string; fileName: string; fileType: string; fileSize: number; caption?: string }) {
    return this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        type: 'FILE',
        content: JSON.stringify({ url: fileInfo.content, fileName: fileInfo.fileName, fileType: fileInfo.fileType, fileSize: fileInfo.fileSize, caption: fileInfo.caption || undefined }),
      },
      include: {
        sender: {
          select: {
            id: true,
            mobile: true,
            employeeProfile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async listUsersForChat(user: JwtPayload) {
    const scope = user.roles.includes(RoleCode.SUPERVISOR)
      ? await this.prisma.employeeProfile.findMany({
          where: { supervisorId: user.employeeProfileId },
          select: { userId: true },
        })
      : null;

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(scope ? { id: { in: scope.map((s) => s.userId) } } : {}),
        NOT: { id: user.sub },
      },
      select: {
        id: true,
        mobile: true,
        employeeProfile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, position: true } },
      },
      take: 200,
    });
    return users.filter((u) => u.employeeProfile);
  }

  async getUnreadCount(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { members: { some: { userId } } },
      select: { id: true },
    });
    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length === 0) return 0;

    // Count messages where readAt is null AND sender is not the current user
    const count = await this.prisma.chatMessage.count({
      where: {
        roomId: { in: roomIds },
        senderId: { not: userId },
        readAt: null,
      },
    });
    return count;
  }

  async markRoomRead(roomId: string, userId: string) {
    await this.prisma.chatMessage.updateMany({
      where: { roomId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async createGroupRoom(name: string, memberIds: string[], creatorId: string) {
    const room = await this.prisma.chatRoom.create({
      data: { type: 'GROUP', name, createdBy: creatorId },
    });
    const ids = new Set<string>([creatorId, ...memberIds]);
    await this.prisma.chatRoomMember.createMany({
      data: Array.from(ids).map((userId) => ({ roomId: room.id, userId })),
    });
    return room;
  }

  async editMessage(messageId: string, content: string, userId: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('پیام یافت نشد');
    if (msg.senderId !== userId) throw new ForbiddenException('فقط فرستنده می‌تواند پیام را ویرایش کند');
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('پیام یافت نشد');
    if (msg.senderId !== userId) throw new ForbiddenException('فقط فرستنده می‌تواند پیام را حذف کند');
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: 'این پیام حذف شده است' },
    });
  }

  async pinMessage(messageId: string, pinned: boolean, userId: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('پیام یافت نشد');
    return this.prisma.chatMessage.update({ where: { id: messageId }, data: { pinned } });
  }
}
