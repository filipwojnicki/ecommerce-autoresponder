import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider } from '../types';
import { TelegramProvider, NtfyProvider } from '../providers';
import { AllegroLokalnieTemplate } from '../templates';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private providers: INotificationProvider[] = [];

  constructor(
    private readonly telegramProvider: TelegramProvider,
    private readonly ntfyProvider: NtfyProvider,
    private readonly allegroTemplate: AllegroLokalnieTemplate,
  ) {}

  onModuleInit() {
    this.providers = [this.ntfyProvider, this.telegramProvider];
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

  async notifyAllegroLokalnie(params: {
    conversationId: string;
    userName: string;
    offerTitle?: string;
    code?: string;
    error?: string;
  }): Promise<void> {
    const message = this.allegroTemplate.render(params);
    await this.notify(message, ['allegrolokalnie']);
  }
}
