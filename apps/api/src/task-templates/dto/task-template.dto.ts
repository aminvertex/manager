import { IsString, IsOptional, IsBoolean, IsInt, Min, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskTemplateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedOutput?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  standardDurationMinutes?: number;

  @ApiPropertyOptional({ enum: ['LOW','MEDIUM','HIGH','URGENT'] })
  @IsOptional()
  @IsIn(['LOW','MEDIUM','HIGH','URGENT'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredSkillLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresSupervisorApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relatedKpi?: string;
}

export class UpdateTaskTemplateDto extends CreateTaskTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TaskTemplateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: string;
}
