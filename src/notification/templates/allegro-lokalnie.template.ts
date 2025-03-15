import { Injectable } from '@nestjs/common';
import { INotificationTemplate } from '../types/INotificationTemplate.interface';

@Injectable()
export class AllegroLokalnieTemplate implements INotificationTemplate {
  getName(): string {
    return 'allegrolokalnie';
  }

  render(params: {
    conversationId: string;
    userName: string;
    offerTitle?: string;
    code?: string;
    error?: string;
  }): string {
    const { conversationId, userName, offerTitle, code, error } = params;

    if (error) {
      return `
⚠️ Błąd na Allegro Lokalnie!

👤 Od: ${userName}
❌ Błąd: ${error}
🔗 ID: ${conversationId}
${offerTitle ? `🏷️ Oferta: ${offerTitle}` : ''}
`;
    }

    if (code) {
      return `
🛒 Nowa wiadomość (sell) na Allegro Lokalnie!

👤 Od: ${userName}
🏷️ Oferta: ${offerTitle}
🎫 Kod: ${code}
🔗 ID: ${conversationId}
`;
    }

    return `
⚠️ Nowa wiadomość (conversation) na Allegro Lokalnie!

👤 Od: ${userName}
🔗 ID: ${conversationId}
`;
  }
}
