import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AllegroLokalnieProvider } from './allegrolokalnie.provider';
import { ProviderRegistryService } from './provider-registry.service';
import { AllegroApiConfig } from './allegro-api.config';
import { CookieManager } from './cookie-manager.service';

@Module({
  imports: [ScheduleModule.forRoot()],
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
