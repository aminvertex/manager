import { IsString, IsOptional, IsIn, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePsychometricDto {
  @ApiProperty()
  @IsString()
  caseCode: string;

  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tool?: string;
}

export class UpdatePsychometricStatusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  analysisStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interpretationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedbackStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needRevision?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorApproval?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}