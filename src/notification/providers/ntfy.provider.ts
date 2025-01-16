import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { INotificationProvider } from '../types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NtfyProvider implements INotificationProvider {
  private readonly logger = new Logger(NtfyProvider.name);

  constructor(private readonly configService: ConfigService) {}

  getName(): string {
    return 'ntfy';
  }

  async send(message: string, tags?: string[]): Promise<boolean> {
    try {
      const ntfyUrl = this.configService.get<string>('ntfyUrl');

      if (!ntfyUrl) {
        return false;
      }

      if (ntfyUrl === '') {
        return false;
      }

      await axios.post(ntfyUrl, message, {
        headers: {
          Tags: tags ? tags.join(',') : '',
        },
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to send ntfy message:', error);
      return false;
    }
  }
}
