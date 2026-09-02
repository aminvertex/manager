import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, AuditService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
