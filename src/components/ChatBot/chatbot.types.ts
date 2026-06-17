// chatbot.types.ts

import type {
  AiCartPreview,
  AiCheckoutDraft,
  AiItemOption,
  AiNavigationAction,
  AiResponseType,
} from '../../services/chatbot.service';

export interface ProductSuggestion {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  type?: 'text' | 'system';
  metadata?: Record<string, unknown>;
  suggestedProducts?: ProductSuggestion[];
  responseType?: AiResponseType;
  itemOptions?: AiItemOption[];
  selectedProduct?: AiItemOption;
  navigation?: AiNavigationAction;
  cart?: AiCartPreview;
  checkout?: AiCheckoutDraft;
}

export interface SuggestionsPanelProps {
  suggestions: string[];
  onSelectSuggestion: (suggestion: string) => void;
  isVisible?: boolean;
  hasHistory?: boolean;
}

export interface TypingIndicatorProps {
  isVisible: boolean;
  message?: string;
}

export interface MessageBubbleProps {
  message: ChatMessage;
}
