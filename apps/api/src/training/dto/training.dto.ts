import { IsString, IsOptional, IsNumber, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTrainingDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: ['INTERNAL','ONLINE','IN_PERSON','SELF_STUDY','SUPERVISION','CASE_STUDY'] })
  @IsOptional()
  @IsIn(['INTERNAL','ONLINE','IN_PERSON','SELF_STUDY','SUPERVISION','CASE_STUDY'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  durationHours?: number;

  @ApiPropertyOptional({ enum: ['PLANNED','IN_PROGRESS','COMPLETED','CANCELLED'] })
  @IsOptional()
  @IsIn(['PLANNED','IN_PROGRESS','COMPLETED','CANCELLED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  examScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  supervisorScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  retrainingRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  trainingDate?: string;
}
