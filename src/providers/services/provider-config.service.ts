import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ProviderConfig } from '../models';
import { Provider } from '../types';

@Injectable()
export class ProviderConfigService {
  private readonly logger = new Logger(ProviderConfigService.name);

  constructor(
    @InjectModel(ProviderConfig)
    private readonly configModel: typeof ProviderConfig,
  ) {}

  async getConfig(provider: Provider): Promise<ProviderConfig | null> {
    return this.configModel.findOne({
      where: { provider },
    });
  }

  async updateConfig(
    provider: Provider,
    config: Partial<ProviderConfig['config']>,
  ): Promise<void> {
    await this.configModel.upsert({
      provider,
      config: {
        ...(await this.getConfig(provider))?.config,
        ...config,
      },
    });
  }
}
