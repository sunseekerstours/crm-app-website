import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma/prisma.module';
import { AuditModule } from '@app/modules/audit/audit.module';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
