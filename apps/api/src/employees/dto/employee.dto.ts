import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsEmail,
  IsArray,
  MinLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MOBILE_REGEX } from '@amatis/shared';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'نام الزامی است' })
  firstName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'نام خانوادگی الزامی است' })
  lastName!: string;

  @ApiProperty({ example: '09120000004' })
  @IsString()
  @Matches(MOBILE_REGEX, { message: 'شماره موبایل نامعتبر است' })
  mobile!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'رمز عبور اولیه باید حداقل ۸ کاراکتر باشد' })
  initialPassword!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryProjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personnelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @ApiPropertyOptional({ enum: ['SINGLE', 'MARRIED', 'OTHER'] })
  @IsOptional()
  @IsEnum(['SINGLE', 'MARRIED', 'OTHER'])
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collaborationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillLevel?: string;

  @ApiPropertyOptional({ description: 'سرپرست بودن در پروژه اصلی' })
  @IsOptional()
  isProjectSupervisor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'ایمیل نامعتبر است' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personnelCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryProjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collaborationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'ایمیل نامعتبر است' })
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collaborationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @ApiPropertyOptional({ enum: ['SINGLE', 'MARRIED', 'OTHER'] })
  @IsOptional()
  @IsEnum(['SINGLE', 'MARRIED', 'OTHER'])
  maritalStatus?: string;
}

export class EmployeeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collaborationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleCode?: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  newPassword!: string;
}
