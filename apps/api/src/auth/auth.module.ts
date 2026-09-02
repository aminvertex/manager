import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordService } from '../common/services/password.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordService, AuditService],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
