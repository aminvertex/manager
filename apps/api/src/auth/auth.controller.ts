import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser, JwtPayload } from '../common/decorators/get-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: parseInt(
        process.env.NODE_ENV === 'production'
          ? process.env.LOGIN_RATE_LIMIT || '5'
          : process.env.LOGIN_RATE_LIMIT_DEV || '100',
        10,
      ),
      ttl: 60000,
    },
  })
  @ApiOperation({ summary: 'ورود با شماره موبایل و رمز عبور' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto, req.ip);
    return { success: true, data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تازه‌سازی توکن' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return { success: true, data: result };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'خروج از سیستم' })
  async logout(@GetUser() user: JwtPayload, @Body() dto: RefreshTokenDto) {
    await this.authService.logout(user.sub, dto.refreshToken);
    return { success: true, message: 'با موفقیت خارج شدید' };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'خروج از همه دستگاه‌ها' })
  async logoutAll(@GetUser() user: JwtPayload) {
    await this.authService.logoutAll(user.sub);
    return { success: true, message: 'از همه دستگاه‌ها خارج شدید' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تغییر رمز عبور' })
  async changePassword(
    @GetUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user, dto);
    return { success: true, data: result };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'اطلاعات کاربر فعلی' })
  async getMe(@GetUser() user: JwtPayload) {
    const result = await this.authService.getMe(user);
    return { success: true, data: result };
  }
}
