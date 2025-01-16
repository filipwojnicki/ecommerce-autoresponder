import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './services';
import { NtfyProvider, TelegramProvider } from './providers';

@Module({
  imports: [ConfigModule],
  providers: [NotificationService, NtfyProvider, TelegramProvider],
  exports: [NotificationService],
})
export class NotificationModule {}
