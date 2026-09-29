import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '@app/prisma/prisma.module';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
