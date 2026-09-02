import { IsOptional, IsString, IsDateString, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitDailyChecklistDto {
  @ApiProperty({ example: '2026-08-22' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'item text -> YES|NO|NA' })
  @IsObject()
  items: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitWeeklyChecklistDto {
  @ApiProperty()
  @IsDateString()
  weekStart: string;

  @ApiProperty()
  @IsDateString()
  weekEnd: string;

  @ApiProperty()
  @IsObject()
  items: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @Min(0)
  @Max(100)
  performanceScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  improvementAreas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctiveActions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actionDeadline?: string;
}

export class ChecklistQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
