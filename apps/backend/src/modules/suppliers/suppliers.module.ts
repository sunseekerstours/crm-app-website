import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma/prisma.module';
import { AuditModule } from '@app/modules/audit/audit.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
