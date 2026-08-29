import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma/prisma.module';
import { AuditModule } from '@app/modules/audit/audit.module';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
