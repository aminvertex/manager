import { IsString, IsOptional, IsBoolean, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQualityControlDto {
  @ApiProperty()
  @IsString()
  taskAssignmentId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outputType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  scientificError?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  calculationError?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  interpretationError?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  documentationDefect?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  writingDefect?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  protocolViolation?: boolean;

  @ApiPropertyOptional({ enum: ['APPROVED','APPROVED_WITH_COMMENT','NEED_REVISION','REJECTED'] })
  @IsOptional()
  @IsIn(['APPROVED','APPROVED_WITH_COMMENT','NEED_REVISION','REJECTED'])
  result?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
