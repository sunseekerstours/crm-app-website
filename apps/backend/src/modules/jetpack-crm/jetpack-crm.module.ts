import { Module, Global } from '@nestjs/common';
import { JetpackCrmService } from './jetpack-crm.service';
import { JetpackCrmController } from './jetpack-crm.controller';

@Global()
@Module({
  controllers: [JetpackCrmController],
  providers: [JetpackCrmService],
  exports: [JetpackCrmService],
})
export class JetpackCrmModule {}
