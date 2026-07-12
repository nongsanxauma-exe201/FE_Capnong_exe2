import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { chatBotService } from '../../services/chatbot.service';
import { notifyCartUpdated } from '../../services/cart.service';
import { ChatMessage } from './chatbot.types';
import { saveChatMessages, loadChatMessages, clearChatStorage, getStorageKey } from './utils/storageUtils';

const DEFAULT_SUGGESTIONS = [
  'Phí ship tính như thế nào?',
  'Tìm xoài',
  'Mua cho tôi 2kg xoài',
  'Có mystery box không',
];

interface ChatBotState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  suggestions: string[];
}

const initialState: ChatBotState = {
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,
  suggestions: DEFAULT_SUGGESTIONS,
};

type Action =
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_SUGGESTIONS'; payload: string[] };

function reducer(state: ChatBotState, action: Action): ChatBotState {
  switch (action.type) {
    case 'TOGGLE_CHAT':
      return { ...state, isOpen: !state.isOpen };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        ),
      };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], error: null };
    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };
    default:
      return state;
  }
}

interface ChatBotContextType {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  suggestions: string[];
  toggleChat: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
  selectSuggestion: (suggestion: string) => void;
  dismissError: () => void;
}

const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

interface ChatBotProviderProps {
  children: React.ReactNode;
  userId?: number;
  userRole?: 'BUYER' | 'SHOP_OWNER' | 'SHIPPER';
}

function getOrCreateChatSessionId(): string {
  const key = 'ai_chat_session_id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const created = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `sess_${Date.now()}`;
  }
}

function getUserMessagesKey(userId?: number) {
  return userId ? getStorageKey(`messages_${userId}`) : getStorageKey('messages');
}

function loadUserMessages(userId?: number): ChatMessage[] {
  try {
    const stored = localStorage.getItem(getUserMessagesKey(userId));
    if (!stored) return [];

    const messages = JSON.parse(stored);
    return messages.map((msg: ChatMessage) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch {
    return loadChatMessages();
  }
}

function saveUserMessages(messages: ChatMessage[], userId?: number) {
  try {
    localStorage.setItem(getUserMessagesKey(userId), JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save chat messages:', error);
    saveChatMessages(messages);
  }
}

function clearUserMessages(userId?: number) {
  localStorage.removeItem(getUserMessagesKey(userId));
  clearChatStorage();
}

export function ChatBotProvider({ children, userId, userRole: _userRole }: ChatBotProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const generateId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (!userId) return;
    loadHistory();
  }, [userId]);

  useEffect(() => {
    if (!userId || state.messages.length === 0) return;
    saveUserMessages(state.messages, userId);
  }, [state.messages, userId]);

  const toggleChat = useCallback(() => {
    dispatch({ type: 'TOGGLE_CHAT' });
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      content: trimmed,
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await chatBotService.sendMessage(trimmed, getOrCreateChatSessionId());

      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: userMsg.id, updates: { status: 'sent' } },
      });

      const botMsg: ChatMessage = {
        id: generateId(),
        content: response.message,
        sender: 'bot',
        timestamp: new Date(),
        status: 'sent',
        responseType: response.type,
        itemOptions: response.itemOptions,
        selectedProduct: response.selectedProduct,
        navigation: response.navigation,
        cart: response.cart,
        checkout: response.checkout,
      };

      dispatch({ type: 'ADD_MESSAGE', payload: botMsg });

      if (response.type === 'CART_UPDATED') {
        notifyCartUpdated();
      }

      if (response.type === 'ITEM_OPTIONS' && response.itemOptions?.length) {
        dispatch({
          type: 'SET_SUGGESTIONS',
          payload: response.itemOptions.map((_, index) => String(index + 1)),
        });
      } else {
        dispatch({ type: 'SET_SUGGESTIONS', payload: DEFAULT_SUGGESTIONS });
      }
    } catch (error: any) {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: userMsg.id, updates: { status: 'error' } },
      });
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadHistory = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const messages = loadUserMessages(userId);
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    } catch {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Không thể tải lịch sử chat.',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [userId]);

  const clearHistory = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      clearUserMessages(userId);
      dispatch({ type: 'CLEAR_MESSAGES' });
      dispatch({ type: 'SET_SUGGESTIONS', payload: DEFAULT_SUGGESTIONS });
    } catch {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Không thể xóa lịch sử chat.',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [userId]);

  const selectSuggestion = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  const dismissError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  return (
    <ChatBotContext.Provider
      value={{
        ...state,
        toggleChat,
        sendMessage,
        clearHistory,
        loadHistory,
        selectSuggestion,
        dismissError,
      }}
    >
      {children}
    </ChatBotContext.Provider>
  );
}

export function useChatBotContext() {
  const context = useContext(ChatBotContext);
  if (!context) throw new Error('useChatBotContext phải dùng trong ChatBotProvider');
  return context;
}
