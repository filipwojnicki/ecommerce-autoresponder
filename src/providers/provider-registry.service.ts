import { Injectable } from '@nestjs/common';
import { IEcommerceProvider } from './types';

@Injectable()
export class ProviderRegistryService {
  private providers: IEcommerceProvider[] = [];

  register(provider: IEcommerceProvider) {
    this.providers.push(provider);
  }

  getProvider(name: string): IEcommerceProvider {
    const provider = this.providers.find((provider) => provider.supports(name));
    if (!provider) {
      throw new Error(`No provider found for: ${name}`);
    }
    return provider;
  }

  getProviders() {
    return this.providers;
  }
}
