import { Module } from '@nestjs/common';
import { JetpackCrmService } from './jetpack-crm.service';
import { JetpackCrmController } from './jetpack-crm.controller';

@Module({
  controllers: [JetpackCrmController],
  providers: [JetpackCrmService],
  exports: [JetpackCrmService],
})
export class JetpackCrmModule {}
