import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { AuditService } from '../common/services/audit.service';
import { DataScopeService } from '../common/services/data-scope.service';

@Module({
  controllers: [QuizController],
  providers: [QuizService, AuditService, DataScopeService],
  exports: [QuizService],
})
export class QuizModule {}
