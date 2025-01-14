import { Injectable } from '@nestjs/common';

@Injectable()
export class AllegroApiConfig {
  readonly baseURL = 'https://allegrolokalnie.pl/api';
  readonly defaultHeaders = {
    'Content-Type': 'application/json',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    host: 'allegrolokalnie.pl',
  };
}
