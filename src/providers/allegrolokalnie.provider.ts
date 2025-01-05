import { Injectable } from '@nestjs/common';
import { IEcommerceProvider } from './types';

@Injectable()
export class AllegroLokalnieProvider implements IEcommerceProvider {
  getName(): string {
    return 'allegrolokalnie';
  }

  supports(provider: string) {
    return provider.toLowerCase() === this.getName();
  }
}
