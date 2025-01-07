import { Injectable } from '@nestjs/common';

@Injectable()
export class CookieManager {
  private cookies: Map<string, string> = new Map();

  setCookies(cookies: Record<string, string>) {
    Object.entries(cookies).forEach(([key, value]) => {
      this.cookies.set(key, value);
    });
  }

  getCookieString(): string {
    return Array.from(this.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  parseCookies(setCookies: string[] | string) {
    const cookieArray = Array.isArray(setCookies) ? setCookies : [setCookies];
    cookieArray.forEach((cookieString) => {
      cookieString.split(';').forEach((cookie) => {
        const [key, value] = cookie.split('=');
        if (key && value) {
          this.cookies.set(key.trim(), value.trim());
        }
      });
    });
  }
}
