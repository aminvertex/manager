import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MOBILE_REGEX } from '@amatis/shared';

export class LoginDto {
  @ApiProperty({ example: '09120000001' })
  @IsString()
  @IsNotEmpty({ message: 'شماره موبایل الزامی است' })
  @Matches(MOBILE_REGEX, { message: 'شماره موبایل نامعتبر است' })
  mobile!: string;

  @ApiProperty({ example: 'Admin@123456' })
  @IsString()
  @IsNotEmpty({ message: 'رمز عبور الزامی است' })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'رمز عبور فعلی الزامی است' })
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد' })
  newPassword!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
