import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { Code, CodeOffer } from '../models';

@Injectable()
export class CodeService {
  private readonly logger = new Logger(CodeService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectModel(Code)
    private readonly codeModel: typeof Code,
    @InjectModel(CodeOffer)
    private readonly codeOfferModel: typeof CodeOffer,
    private sequelize: Sequelize,
  ) {}

  async findCodesForConversation(conversationId: string) {
    return await this.codeModel.findAll({
      where: { conversationId },
    });
  }

  async getUniqueCodeWithMessage(conversationId: string, title: string) {
    let retryCount = 0;
    const normalizedTitle = title.trim().toLowerCase();

    this.logger.debug(`${conversationId}: Getting unique code`);

    while (retryCount < this.MAX_RETRIES) {
      const transaction = await this.sequelize.transaction();

      try {
        const offer = await this.codeOfferModel.findOne({
          where: {
            title: {
              [Op.like]: this.sequelize.literal(
                `LOWER('%${normalizedTitle}%')`,
              ),
            },
            used: true,
          },
          transaction,
        });

        if (!offer) {
          await transaction.rollback();
          this.logger.warn(`${conversationId}: No available offer found`);
          return 'Dziekuje za zakup! Kod zostanie wyslany w ciagu maksymalnie kilku godzin.';
        }

        const code = await this.codeModel.findOne({
          where: { used: false, conversationId: null, codeOfferId: offer.id },
          lock: Transaction.LOCK.UPDATE,
          transaction,
        });

        this.logger.debug(`${conversationId}: Found code ${code?.code}`);

        if (!code) {
          await transaction.rollback();
          this.logger.warn(`${conversationId}: No available code found`);
          return `Dziekuje za zakup! ${offer.messageFailed}`;
        }

        const message = `Dziekuje za zakup! Kod: ${code.code}. ${offer.messageCorrect ?? ''}`;

        await code.update(
          {
            used: true,
            message,
            conversationId,
          },
          { transaction },
        );

        await transaction.commit();

        this.logger.debug(`${conversationId}: Reserved code ${code.code}`);

        return message;
      } catch (error) {
        await transaction?.rollback();
        retryCount++;

        if (retryCount === this.MAX_RETRIES) {
          this.logger.error(
            `${conversationId}: Failed to get unique code after max retries`,
            error,
          );
          return null;
        }

        this.logger.warn(
          `${conversationId}: Retrying to get code (attempt ${retryCount}/${this.MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
      }
    }

    return null;
  }
}
