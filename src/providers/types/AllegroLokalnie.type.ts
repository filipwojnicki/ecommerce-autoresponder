export type DealState = {
  accepted_buy_now_request: boolean;
  accepted_cart_agreement_request: boolean;
  active_reservation_to: string | null;
  pending_buy_now_request: boolean;
  pending_cart_agreement_request: boolean;
  pending_reservation: boolean;
};

export type MessageContent = {
  body?: string;
  button?: {
    label: string;
    url: string;
  };
  image_path?: string;
  markdown_content?: string;
  subtitle?: string;
  title?: string;
  offer_previous_price_cents?: number;
  offer_price_cents?: number;
  offer_title?: string;
};

export type MessageType =
  | 'text'
  | 'marketing'
  | 'buy_now_transaction_finalized'
  | 'negotiations_price_changed';

export type Message = {
  author_id: string;
  content: MessageContent | null;
  conversation_id: string;
  id: string;
  inserted_at: string;
  type: MessageType;
  verification_status: string | null;
};

export type Subject = {
  first_item_title: string;
  id: string;
  is_seller: boolean;
  items_count: number;
  participant_id: string;
  participant_last_seen: string | null;
  participant_name: string;
  participant_type: 'User' | 'AllegroLokalnie';
  photo_thumb: string;
  price_cents: number | null;
  type: 'buying_intent' | 'transaction' | 'marketing';
};

export type MessageEntry = {
  deal_state: DealState;
  id: string;
  is_unseen: boolean;
  last_message: Message;
  pinned: boolean;
  subject: Subject;
};

export type MessagesResponse = {
  entries: MessageEntry[];
  page_number: number;
  page_size: number;
  total_entries: number;
  total_pages: number;
};

export type ConversationMessage = {
  author_id: string;
  content: MessageContent | null;
  conversation_id: string;
  delivered_at: string;
  id: string;
  inserted_at: string;
  read_at?: string;
  type: MessageType;
  verification_status: 'cleared' | 'accepted' | null;
};

export type ConversationMessagesResponse = {
  messages: ConversationMessage[];
};
