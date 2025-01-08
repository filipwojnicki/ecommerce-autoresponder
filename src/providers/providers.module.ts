import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AllegroLokalnieProvider } from './allegrolokalnie.provider';
import { AllegroApiConfig } from './allegro-api.config';
import { CookieManager, ProviderRegistryService } from './services';
import { CodeModule } from 'src/code';

@Module({
  imports: [ScheduleModule.forRoot(), CodeModule],
  providers: [
    AllegroLokalnieProvider,
    ProviderRegistryService,
    CookieManager,
    AllegroApiConfig,
  ],
  exports: [ProviderRegistryService, AllegroLokalnieProvider],
})
export class ProvidersModule {
  constructor(
    private registry: ProviderRegistryService,
    private allegroLokalnieProvider: AllegroLokalnieProvider,
  ) {
    this.registry.register(this.allegroLokalnieProvider);
  }
}
