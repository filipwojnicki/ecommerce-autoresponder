import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule } from '@nestjs/sequelize';
import { AllegroApiConfig } from './configs';
import { CodeModule } from 'src/code';
import {
  CookieManager,
  ProviderConfigService,
  ProviderRegistryService,
  AllegroLokalnieProviderService,
} from './services';
import { ProviderConfig } from './models';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CodeModule,
    SequelizeModule.forFeature([ProviderConfig]),
  ],
  providers: [
    AllegroLokalnieProviderService,
    ProviderRegistryService,
    CookieManager,
    AllegroApiConfig,
    ProviderConfigService,
  ],
  exports: [ProviderRegistryService, AllegroLokalnieProviderService],
})
export class ProvidersModule {
  constructor(
    private registry: ProviderRegistryService,
    private allegroLokalnieProvider: AllegroLokalnieProviderService,
  ) {
    this.registry.register(this.allegroLokalnieProvider);
  }
}
