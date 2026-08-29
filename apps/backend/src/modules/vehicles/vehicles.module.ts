import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma/prisma.module';
import { AuditModule } from '@app/modules/audit/audit.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
