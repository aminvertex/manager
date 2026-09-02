import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEvaluationDto {
  @IsString()
  employeeId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  period: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  strengths?: string;

  @IsOptional()
  @IsString()
  improvementAreas?: string;

  @IsOptional()
  @IsString()
  correctiveActions?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEvaluationDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

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
  notes?: string;
}
