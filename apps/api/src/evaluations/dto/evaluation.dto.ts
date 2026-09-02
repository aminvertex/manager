import { IsString, IsOptional, IsObject, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const EVALUATION_CRITERIA = [
  'scientific_accuracy',      // دقت علمی
  'analysis_correctness',     // صحت تحلیل
  'interpretation_quality',   // کیفیت تفسیر
  'personalization',          // شخصی‌سازی
  'protocol_compliance',      // رعایت پروتکل
  'writing_quality',          // کیفیت نگارش
  'documentation',            // مستندسازی
  'timeliness',               // رعایت زمان‌بندی
  'independence',             // استقلال در انجام کار
  'professional_ethics',      // رعایت اخلاق حرفه‌ای
] as const;

export const EVALUATION_RESULTS = ['APPROVED', 'APPROVED_WITH_COMMENT', 'NEED_REVISION', 'REJECTED'] as const;

export class CreateEvaluationDto {
  @ApiProperty()
  @IsString()
  taskAssignmentId: string;

  @ApiProperty({ description: 'criterion -> 1..5' })
  @IsObject()
  scores: Record<string, number>;

  @ApiPropertyOptional({ enum: EVALUATION_RESULTS })
  @IsOptional()
  @IsIn(EVALUATION_RESULTS)
  result?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
