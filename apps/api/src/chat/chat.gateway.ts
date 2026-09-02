import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || (client.handshake.headers.authorization || '').replace('Bearer ', '');
      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.log(`Chat user connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat user disconnected: ${client.data.userId}`);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    if (!roomId) return;
    const userId = client.data.userId;
    const isMember = await this.chatService.isRoomMember(roomId, userId);
    if (!isMember) return { error: 'unauthorized' };
    client.join(`room:${roomId}`);
    return { ok: true };
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId: string; content: string }) {
    const userId = client.data.userId;
    if (!body.roomId || !body.content?.trim()) return { error: 'invalid' };
    const isMember = await this.chatService.isRoomMember(body.roomId, userId);
    if (!isMember) return { error: 'unauthorized' };
    const message = await this.chatService.createMessage(body.roomId, userId, body.content);
    this.server.to(`room:${body.roomId}`).emit('message:new', { ...message, roomId: body.roomId });
    return { ok: true, message };
  }

  @SubscribeMessage('typing')
  async typing(@ConnectedSocket() client: Socket, @MessageBody() body: { roomId: string; isTyping: boolean }) {
    client.to(`room:${body.roomId}`).emit('typing', { userId: client.data.userId, isTyping: body.isTyping });
  }
}