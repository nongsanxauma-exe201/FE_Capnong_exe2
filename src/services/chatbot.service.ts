/**
 * AI Chat Agent Service
 * Full URL: {API_BASE_URL}/ai/chat → /api/v1/ai/chat
 */

import { httpClient } from './http.client';

// ===== AI AGENT TYPES (BE) =====
export type AiItemType = 'PRODUCT' | 'MYSTERY_BOX' | 'ANY';

export type AiResponseType =
  | 'TEXT'
  | 'ITEM_OPTIONS'
  | 'PRODUCT_DETAIL'
  | 'NAVIGATION'
  | 'CART_UPDATED'
  | 'CHECKOUT_DRAFT'
  | 'ERROR';

export interface AiChatRequest {
  message: string;
  sessionId?: string;
}

export interface AiItemOption {
  itemType: AiItemType;
  itemId: number;
  name: string;
  imageUrl?: string;
  price?: number;
  unit?: string;
  availableQuantity?: number;
  description?: string;
}

export interface AiCartItem {
  itemType: AiItemType;
  itemId: number;
  name: string;
  imageUrl?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
}

export interface AiCartPreview {
  items: AiCartItem[];
  totalAmount?: number;
}

export interface AiCheckoutDraft {
  checkoutUrl: string;
  totalAmount?: number;
}

export interface AiNavigationAction {
  url: string;
  label: string;
}

export interface AiChatResponse {
  type: AiResponseType;
  message: string;
  itemOptions?: AiItemOption[];
  selectedProduct?: AiItemOption;
  navigation?: AiNavigationAction;
  cart?: AiCartPreview;
  checkout?: AiCheckoutDraft;
}

/** @deprecated Legacy chatbot product suggestion */
export interface ProductSuggestion {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

/** @deprecated Legacy chatbot request */
export interface ChatRequest {
  message: string;
  userApiKey?: string;
}

// ===== SERVICE =====
export const chatBotService = {
  /**
   * Gửi tin nhắn tới AI Agent
   * POST /ai/chat
   */
  async sendMessage(message: string, sessionId?: string): Promise<AiChatResponse> {
    if (!message || !message.trim()) {
      throw new Error('Tin nhắn không được để trống');
    }

    if (message.length > 2000) {
      throw new Error('Tin nhắn không được vượt quá 2000 ký tự');
    }

    const body: AiChatRequest = {
      message: message.trim(),
      sessionId: sessionId?.trim() || undefined,
    };

    try {
      const response = await httpClient.post<AiChatResponse>('/ai/chat', body);
      const result = response.result;

      if (!result) {
        throw new Error(response.message || 'Không nhận được phản hồi từ AI');
      }

      if (result.type === 'ERROR') {
        throw new Error(result.message || 'Đã xảy ra lỗi');
      }

      return result;
    } catch (error: any) {
      const apiMessage =
        error?.data?.message ||
        error?.data?.result?.message ||
        error?.message;

      throw new Error(apiMessage || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    }
  },
};
