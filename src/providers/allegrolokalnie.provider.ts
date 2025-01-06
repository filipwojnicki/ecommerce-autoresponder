import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CookieManager } from './cookie-manager.service';
import { AllegroApiConfig } from './allegro-api.config';
import {
  type ConversationMessagesResponse,
  IEcommerceProvider,
  type MessageEntry,
  type MessagesResponse,
} from './types';

@Injectable()
export class AllegroLokalnieProvider implements IEcommerceProvider {
  private lastCheck: Date;
  private readonly api: AxiosInstance;
  private readonly logger = new Logger(AllegroLokalnieProvider.name);

  constructor(
    private readonly cookieManager: CookieManager,
    private readonly apiConfig: AllegroApiConfig,
  ) {
    this.lastCheck = new Date();
    this.cookieManager.setCookies(this.apiConfig.defaultCookies);

    this.api = this.setupAxiosInstance();
  }

  getName() {
    return 'allegrolokalnie';
  }

  private setupAxiosInstance(): AxiosInstance {
    const api = axios.create({
      baseURL: this.apiConfig.baseURL,
      headers: this.apiConfig.defaultHeaders,
      timeout: 10000,
    });

    this.setupInterceptors(api);
    return api;
  }

  private setupInterceptors(api: AxiosInstance) {
    api.interceptors.request.use((config) => {
      config.headers['Cookie'] = this.cookieManager.getCookieString();
      this.logger.debug(
        `[Request] ${config.method?.toUpperCase()} ${config.url}`,
      );
      this.logger.debug(`[Cookies] ${config.headers['Cookie']}`);
      return config;
    });

    api.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `[Response] ${response.status} ${response.config.url}`,
        );

        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
          this.logger.debug(`[New Cookies] ${setCookie}`);
          this.cookieManager.parseCookies(setCookie);
        }

        return response;
      },
      (error) => {
        this.logger.error(
          `[Error] ${error.response?.status} ${error.response?.statusText}`,
        );
        throw error;
      },
    );
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'allegroLokalnieCheckInbox',
  })
  async checkInbox() {
    try {
      this.logger.log('Starting periodic messages check');
      const response = await this.api.get<MessagesResponse>(
        '/chat/inbox?page_size=20&page=1',
      );

      if (response.status !== 200) {
        return;
      }

      if (!response.data.entries) {
        return;
      }

      if (response.data.entries.length === 0) {
        return;
      }
      this.logger.debug(`Messages count: ${response.data.entries.length}`);

      const newConversations = this.filterNewConversations(
        response.data.entries,
      );

      this.logger.log(`Found ${newConversations.length} new messages`);

      if (newConversations.length === 0) {
        return;
      }

      newConversations.map((conversation) => {
        this.logger.log(
          `Conversation id ${conversation.id} from ${conversation.subject.participant_name}`,
        );
      });
    } catch (error) {
      this.logger.error('Failed to check messages', error);
    }
  }

  async sendMessage(conversationId: string, message: string) {
    try {
      const data = {
        id: uuidv4(),
        conversation_id: conversationId,
        type: 'text',
        content: {
          body: message,
        },
      };

      const response = await this.api.post<{
        message: {
          id: string;
        };
      }>('/chat/messages', JSON.stringify(data));

      if (response.status !== 200) {
        return false;
      }

      if (!response.data) {
        return false;
      }

      if (!response.data.message?.id) {
        return false;
      }

      this.logger.debug(`Sent message with id ${response.data.message.id}`);

      return true;
    } catch (error) {
      this.logger.error('Failed to send message', error);
      return false;
    }
  }

  async readConversationMessages(conversationId: string) {
    try {
      const response = await this.api.get<ConversationMessagesResponse>(
        `/chat/messages?conversation_id=${conversationId}`,
      );

      if (response.status !== 200) {
        return false;
      }

      if (!response.data?.messages) {
        return false;
      }

      const { messages } = response.data;

      this.logger.debug(
        `Read ${messages.length} messages from conversation ${conversationId}`,
      );

      return messages;
    } catch (error) {
      this.logger.error('Failed to read conversation messages', error);
      return false;
    }
  }

  filterNewConversations(conversations: MessageEntry[]) {
    return conversations.filter(
      (conversation) =>
        conversation.is_unseen &&
        conversation.subject.participant_type === 'User',
    );
  }

  supports(provider: string) {
    return provider.toLowerCase() === this.getName();
  }
}
