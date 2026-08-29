import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma/prisma.module';
import { AuditModule } from '@app/modules/audit/audit.module';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
