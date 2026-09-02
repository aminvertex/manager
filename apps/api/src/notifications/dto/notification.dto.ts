import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ enum: ['true','false'] })
  @IsOptional()
  @IsIn(['true','false'])
  unreadOnly?: string;
}
