import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './services';
import { NtfyProvider, TelegramProvider } from './providers';
import { AllegroLokalnieTemplate } from './templates';

@Module({
  imports: [ConfigModule],
  providers: [
    NotificationService,
    NtfyProvider,
    TelegramProvider,
    AllegroLokalnieTemplate,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
