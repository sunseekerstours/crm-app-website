import { Module } from '@nestjs/common';
import { JetpackCrmModule } from '@app/modules/jetpack-crm/jetpack-crm.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [JetpackCrmModule],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}

