import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCriticalIncidentDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiProperty({ enum: ['LOW','MEDIUM','HIGH','CRITICAL'] })
  @IsIn(['LOW','MEDIUM','HIGH','CRITICAL'])
  severity: string;

  @ApiProperty({ enum: ['CONFIDENTIALITY_VIOLATION','SERIOUS_SCIENTIFIC_ERROR','PROFESSIONAL_VIOLATION','OTHER'] })
  @IsIn(['CONFIDENTIALITY_VIOLATION','SERIOUS_SCIENTIFIC_ERROR','PROFESSIONAL_VIOLATION','OTHER'])
  type: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  incidentDate?: string;
}

export class UpdateCriticalIncidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ enum: ['OPEN','RESOLVED'] })
  @IsOptional()
  @IsIn(['OPEN','RESOLVED'])
  status?: string;
}
