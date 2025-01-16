import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider } from '../types';
import { TelegramProvider, NtfyProvider } from '../providers';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private providers: INotificationProvider[] = [];

  constructor(
    private readonly telegramProvider: TelegramProvider,
    private readonly ntfyProvider: NtfyProvider,
  ) {}

  onModuleInit() {
    this.providers = [this.telegramProvider, this.ntfyProvider];
  }

  async notify(message: string, tags?: string[]): Promise<void> {
    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          await provider.send(message, tags);
        } catch (error) {
          this.logger.error(
            `Failed to send notification via ${provider.getName()}:`,
            error,
          );
        }
      }),
    );
  }
}
