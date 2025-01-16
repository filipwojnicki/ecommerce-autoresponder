import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { INotificationProvider } from '../types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramProvider implements INotificationProvider {
  private readonly logger = new Logger(TelegramProvider.name);

  constructor(private readonly configService: ConfigService) {}

  getName(): string {
    return 'telegram';
  }

  async send(message: string) {
    try {
      const telegramToken = this.configService.get<string>('telegram.token');
      const telegramChatId = this.configService.get<string>('telegram.chatId');

      if (!telegramToken || !telegramChatId) {
        return false;
      }

      if (telegramToken === '' || telegramChatId === '') {
        return false;
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${telegramToken}/sendMessage`,
        {
          chat_id: telegramChatId,
          text: message,
        },
      );

      if (response.status !== 200) {
        throw new Error(`Failed to send telegram message: ${response.status}`);
      }

      if (response.data.ok !== true) {
        throw new Error(`Failed to send telegram message: ${response.data}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to send telegram message:', error);
      return false;
    }
  }
}
