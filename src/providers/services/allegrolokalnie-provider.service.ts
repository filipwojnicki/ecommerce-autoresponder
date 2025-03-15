import { Injectable, Logger } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CookieManager, ProviderConfigService } from './';
import { AllegroApiConfig } from '../configs';
import {
  ConversationMessage,
  type ConversationMessagesResponse,
  IEcommerceProvider,
  type MessageEntry,
  type MessagesResponse,
  Provider,
} from '../types';
import { CodeService } from 'src/code';
import { NotificationService } from 'src/notification/services';

const AllegroLokalnieCheckInboxCronJobName = 'allegroLokalnieCheckInbox';

@Injectable()
export class AllegroLokalnieProviderService implements IEcommerceProvider {
  private readonly MAX_FAILURES = 5;
  private readonly api: AxiosInstance;
  private readonly logger = new Logger(AllegroLokalnieProviderService.name);
  private failureCount = 0;

  constructor(
    private readonly cookieManager: CookieManager,
    private readonly providerConfigService: ProviderConfigService,
    private readonly apiConfig: AllegroApiConfig,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly codeService: CodeService,
    private readonly notificationService: NotificationService,
  ) {
    this.api = this.setupAxiosInstance();
  }

  async onModuleInit() {
    const data = await this.providerConfigService.getConfig(this.getName());

    if (!data) {
      throw new Error('Provider config not found');
    }

    const config = JSON.parse(data.config.toString());

    if (!config.cookies) {
      throw new Error('No cookies found in provider config');
    }

    this.cookieManager.setCookies(config.cookies);

    if (config.enabled) {
      this.startCronJob();
    } else {
      this.stopCronJob();
    }
  }

  getName() {
    return Provider.allegroLokalnie;
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

  async checkInbox() {
    try {
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
        this.logger.debug('No messages found');
        return;
      }
      this.logger.debug(`Messages count: ${response.data.entries.length}`);

      const newConversations = this.filterNewConversations(
        response.data.entries,
      );

      if (newConversations.length === 0) {
        this.logger.debug('No new messages found');
        return;
      }

      this.logger.log(`Found ${newConversations.length} new messages`);

      await Promise.all(
        newConversations.map((conv) => this.processNewConversation(conv)),
      );

      this.failureCount = 0;
    } catch (error) {
      this.logger.error('Failed to check messages', error);

      if (error.response) {
        if (error.response.status !== 200) {
          this.logger.error('Invalid response status', error.response?.status);
          this.handleFailure();
        }
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
        await this.notificationService.notifyAllegroLokalnie({
          conversationId: conversation.id,
          userName: conversation.subject.participant_name,
          offerTitle: conversation.subject.first_item_title,
        });
        return false;
      }

      const conversationCodes = await this.codeService.findCodesForConversation(
        conversation.id,
      );

      if (conversationCodes.length > 0) {
        this.logger.debug(
          `Conversation id ${conversation.id} already has codes assigned`,
        );
        await this.notificationService.notifyAllegroLokalnie({
          conversationId: conversation.id,
          userName: conversation.subject.participant_name,
          offerTitle: conversation.subject.first_item_title,
          error: 'already has codes assigned, but found new message',
        });
        return false;
      }

      const offer = await this.codeService.findCodeOfferByTitle(
        conversation.subject.first_item_title,
      );

      if (!offer) {
        this.logger.warn(`${conversation.id}: No available offer found`);
        await this.sendMessage(
          conversation.id,
          'Dziekuje za zakup! Zakup zostanie wyslany w ciagu maksymalnie kilku godzin.',
        );
        await this.notificationService.notifyAllegroLokalnie({
          conversationId: conversation.id,
          userName: conversation.subject.participant_name,
          offerTitle: conversation.subject.first_item_title,
          error: 'no code offer found',
        });
        return false;
      }

      const isCorrectMessageSent =
        this.checkIfCorrectMessageWasSentToConversation(
          messages,
          offer.messageCorrect,
        );

      this.logger.debug(
        `Conversation id ${conversation.id} correct message was sent: ${isCorrectMessageSent}`,
      );

      if (isCorrectMessageSent) {
        await this.notificationService.notifyAllegroLokalnie({
          conversationId: conversation.id,
          userName: conversation.subject.participant_name,
          offerTitle: conversation.subject.first_item_title,
          error: 'correct message was already sent',
        });
        return false;
      }

      const offerCode = await this.codeService.getUniqueCodeWithMessage(
        conversation.id,
        offer,
      );

      await this.sendMessage(conversation.id, offerCode.message);
      await this.notificationService.notifyAllegroLokalnie({
        conversationId: conversation.id,
        userName: conversation.subject.participant_name,
        offerTitle: conversation.subject.first_item_title,
        code: offerCode.code,
      });
    } catch (error) {
      this.logger.error('Failed to process conversation:', error);
      await this.notificationService.notifyAllegroLokalnie({
        conversationId: conversation.id,
        userName: conversation.subject.participant_name,
        offerTitle: conversation.subject.first_item_title,
        error: 'Failed to generate unique code',
      });
    }
  }

  private normalizeText(text: string | null | undefined) {
    if (!text) return '';
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  checkIfCorrectMessageWasSentToConversation(
    conversation: ConversationMessage[],
    correctMessage,
  ) {
    if (!conversation?.length || !correctMessage) {
      return false;
    }

    const normalizedCorrectMessage = this.normalizeText(correctMessage);

    return conversation.some((message) =>
      this.normalizeText(message?.content?.body).includes(
        normalizedCorrectMessage,
      ),
    );
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

  private startCronJob() {
    try {
      const job = new CronJob(CronExpression.EVERY_MINUTE, () => {
        this.checkInbox();
      });

      this.schedulerRegistry.addCronJob(
        AllegroLokalnieCheckInboxCronJobName,
        job,
      );
      job.start();

      this.logger.log(
        `${AllegroLokalnieCheckInboxCronJobName} Cron job started`,
      );
    } catch (error) {
      this.logger.error('Failed to start cron job:', error);
    }
  }

  private stopCronJob() {
    try {
      const job = this.schedulerRegistry.getCronJob(
        AllegroLokalnieCheckInboxCronJobName,
      );

      if (!job) {
        this.logger.warn('No cron job found to stop');
        return;
      }

      if (!job.running) {
        this.logger.warn('Cron job is already stopped');
        return;
      }

      job.stop();
      this.schedulerRegistry.deleteCronJob(
        AllegroLokalnieCheckInboxCronJobName,
      );
      this.logger.log(
        `${AllegroLokalnieCheckInboxCronJobName} Cron job stopped`,
      );
    } catch (error) {
      this.logger.error('Failed to stop cron job:', error);
    }
  }

  private handleFailure() {
    this.failureCount++;
    this.logger.warn(
      `Failure count: ${this.failureCount}/${this.MAX_FAILURES}`,
    );

    if (this.failureCount >= this.MAX_FAILURES) {
      this.stopCronJob();
      this.notificationService.notify(
        `Allegro Lokalnie provider failed to check messages ${this.failureCount} times`,
        ['allegroLokalnie', 'error'],
      );
    }
  }

  supports(provider: string) {
    return provider.toLowerCase() === this.getName();
  }
}
