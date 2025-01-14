import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CookieManager } from './services';
import { AllegroApiConfig } from './allegro-api.config';
import {
  type ConversationMessagesResponse,
  IEcommerceProvider,
  type MessageEntry,
  type MessagesResponse,
} from './types';
import { CodeService } from 'src/code';

const AllegroLokalnieCheckInboxCronJobName = 'allegroLokalnieCheckInbox';

@Injectable()
export class AllegroLokalnieProvider implements IEcommerceProvider {
  private readonly MAX_FAILURES = 5;
  private lastCheck: Date;
  private readonly api: AxiosInstance;
  private readonly logger = new Logger(AllegroLokalnieProvider.name);
  private failureCount = 0;

  constructor(
    private readonly cookieManager: CookieManager,
    private readonly apiConfig: AllegroApiConfig,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly codeService: CodeService,
  ) {
    this.lastCheck = new Date();
    this.cookieManager.setCookies(this.apiConfig.defaultCookies);

    this.api = this.setupAxiosInstance();
    this.checkInbox();
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
    name: AllegroLokalnieCheckInboxCronJobName,
  })
  async checkInbox() {
    try {
      this.logger.log('Starting periodic messages check');
      const response = await this.api.get<MessagesResponse>(
        '/chat/inbox?page_size=20&page=1',
      );

      if (response.status !== 200) {
        throw new Error('Failed to fetch messages');
      }

      if (!response.data.entries) {
        throw new Error('Invalid response data');
      }

      if (response.data.entries.length === 0) {
        throw new Error('No messages found');
      }
      this.logger.debug(`Messages count: ${response.data.entries.length}`);

      const newConversations = this.filterNewConversations(
        response.data.entries,
      );

      if (newConversations.length === 0) {
        throw new Error('No new messages found');
      }

      this.logger.log(`Found ${newConversations.length} new messages`);

      await Promise.all(
        newConversations.map((conv) => this.processNewConversation(conv)),
      );

      this.failureCount = 0;
    } catch (error) {
      this.logger.error('Failed to check messages', error);

      if (error.response?.status !== 200) {
        this.handleFailure();
      }

      if (
        error?.message === 'Failed to fetch messages' ||
        error?.message === 'Invalid response data'
      ) {
        this.handleFailure();
      }
    }
  }

  async processNewConversation(conversation: MessageEntry) {
    try {
      this.logger.log(
        `Conversation id ${conversation.id} from ${conversation.subject.participant_name}`,
      );

      const messages = await this.readConversationMessages(conversation.id);

      if (!messages.length) {
        return false;
      }

      const lastMessage = messages[messages.length - 1];
      await this.markMassageAsRead(lastMessage.id).catch(() => null);

      const isBuyNowTransaction = messages.some(
        (conversation) => conversation.type === 'buy_now_transaction_finalized',
      );

      this.logger.debug(
        `Conversation id ${conversation.id} is buy now transaction: ${isBuyNowTransaction}`,
      );

      if (!isBuyNowTransaction) {
        return false;
      }

      const conversationCodes = await this.codeService.findCodesForConversation(
        conversation.id,
      );

      if (conversationCodes.length > 0) {
        this.logger.debug(
          `Conversation id ${conversation.id} already has codes assigned`,
        );
        return false;
      }

      const messageWithCode = await this.codeService.getUniqueCodeWithMessage(
        conversation.id,
        conversation.subject.first_item_title,
      );

      await this.sendMessage(conversation.id, messageWithCode);
    } catch (error) {
      this.logger.error('Failed to process conversation:', error);
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
        return [];
      }

      if (!response.data?.messages) {
        return [];
      }

      const { messages } = response.data;

      this.logger.debug(
        `Read ${messages.length} messages from conversation ${conversationId}`,
      );

      if (!messages.length) {
        return [];
      }

      return messages;
    } catch (error) {
      this.logger.error('Failed to read conversation messages', error);
      return [];
    }
  }

  async markMassageAsRead(messageId: string) {
    try {
      const response = await this.api.post(
        `/chat/messages/${messageId}/mark_as_read`,
      );

      if (response.status !== 200) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to mark message as read', error);
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

  private handleFailure() {
    this.failureCount++;
    this.logger.warn(
      `Failure count: ${this.failureCount}/${this.MAX_FAILURES}`,
    );

    if (this.failureCount >= this.MAX_FAILURES) {
      try {
        const job = this.schedulerRegistry.getCronJob(
          AllegroLokalnieCheckInboxCronJobName,
        );
        job.stop();
        this.logger.error(
          `${AllegroLokalnieCheckInboxCronJobName} Cron job disabled due to multiple failures`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to stop ${AllegroLokalnieCheckInboxCronJobName} cron job`,
          error,
        );
      }
    }
  }

  restartCheckInbox() {
    try {
      const job = this.schedulerRegistry.getCronJob(
        AllegroLokalnieCheckInboxCronJobName,
      );
      this.failureCount = 0;
      job.start();
      this.logger.log(
        `${AllegroLokalnieCheckInboxCronJobName} Cron job restarted`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start ${AllegroLokalnieCheckInboxCronJobName} cron job`,
        error,
      );
    }
  }

  supports(provider: string) {
    return provider.toLowerCase() === this.getName();
  }
}
