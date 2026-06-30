/**
 * ChatBot Modal Component
 */

import React, { useEffect, useRef } from 'react';
import { useChatBotContext } from './ChatBotContext';
import OptimizedMessageInput from './OptimizedMessageInput';
import VirtualizedMessageList from './VirtualizedMessageList';
import { TypingIndicator } from './TypingIndicator';
import { SuggestionsPanel } from './SuggestionsPanel';
import {
  useFocusManagement,
  useScreenReader,
  useHighContrast,
  useReducedMotion,
  useAriaLiveRegion
} from './hooks/useAccessibility';
import styles from './ChatBot.module.css';
import { globalShowConfirm } from '../../contexts/PopupContext';

interface ChatBotModalProps {
  title?: string;
  className?: string;
}

export function ChatBotModal({
  title = 'Chat Box',
  className = ''
}: ChatBotModalProps) {
  const {
    isOpen,
    toggleChat,
    error,
    messages,
    isLoading,
    sendMessage,
    suggestions,
    selectSuggestion,
    clearHistory
  } = useChatBotContext();

  // ✅ Ref để scroll xuống cuối
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Accessibility hooks
  const { containerRef, focusFirst } = useFocusManagement(isOpen, true, toggleChat);
  const { announce } = useScreenReader();
  const { isHighContrast } = useHighContrast();
  const { prefersReducedMotion } = useReducedMotion();
  const { message: liveMessage, updateMessage } = useAriaLiveRegion();

  // ✅ Scroll xuống cuối mỗi khi modal được mở
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 150); // đợi animation modal mở xong
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'bot') {
        announce(`Chat Box: ${lastMessage.content}`, 'polite');
        updateMessage('Tin nhắn mới từ Chat Box', 'polite');
      }
    }
  }, [messages, announce, updateMessage]);

  useEffect(() => {
    if (isLoading) {
      announce('Đang xử lý...', 'polite');
      updateMessage('Đang xử lý yêu cầu', 'polite');
    }
  }, [isLoading, announce, updateMessage]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('chatbot-no-scroll');
    }
    return () => {
      document.body.classList.remove('chatbot-no-scroll');
    };
  }, [isOpen]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      toggleChat();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${styles['chatbot-modal-overlay']} ${isOpen ? styles['is-open'] : ''} ${className}`}
      onClick={handleBackdropClick}
      style={{
        opacity: prefersReducedMotion ? 1 : undefined,
        transition: prefersReducedMotion ? 'none' : undefined
      }}
    >
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`${styles['chatbot-modal']} ${isOpen ? styles['is-open'] : ''} ${isHighContrast ? styles['is-high-contrast'] : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-title"
        aria-describedby="chatbot-description"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles['chatbot-modal-header']}>
          <div className={styles['chatbot-modal-title']}>
            <div className={styles['chatbot-avatar']} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
                <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"></path>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
            <div className={styles['chatbot-title-text']}>
              <h2 id="chatbot-title">{title}</h2>
              <p id="chatbot-status">Sẵn sàng hỗ trợ bạn</p>
            </div>
          </div>

          {/* ✅ Nhóm nút bên phải */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

            {/* Nút xóa lịch sử — chỉ hiện khi có tin nhắn */}
            {messages.length > 0 && (
              <button
                onClick={async () => {
                  if (await globalShowConfirm('Xác nhận', 'Bạn có chắc muốn làm mới cuộc trò chuyện không?')) {
                    clearHistory();
                  }
                }}
                className={styles['chatbot-close-button']}
                aria-label="Làm mới cuộc trò chuyện"
                title="Làm mới cuộc trò chuyện"
                disabled={isLoading}
              >
                {/* ✅ Icon làm mới thay vì thùng rác */}
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}

            {/* Nút đóng */}
            <button
              onClick={toggleChat}
              className={styles['chatbot-close-button']}
              aria-label="Đóng chat"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Screen Reader */}
        <div id="chatbot-description" className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
          Chat Box hỗ trợ mua sắm nông sản
        </div>
        <div aria-live="polite" aria-atomic="true" className="sr-only" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
          {liveMessage}
        </div>

        {/* Error Banner */}
        {error && (
          <div className={styles['chatbot-error-banner']} role="alert">
            <div style={{ display: 'flex' }}>
              <div style={{ flexShrink: 0 }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div style={{ marginLeft: '12px' }}>
                <p>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Content */}
        <div className={styles['chatbot-modal-content']} role="main">
          <div className={styles['chatbot-messages-area']} role="log" aria-label="Cuộc trò chuyện">

            {messages.length === 0 ? (
              <div className={`${styles['chatbot-welcome']} text-center py-8`}>
                <div className={`${styles['chatbot-welcome-icon']} mx-auto mb-4`}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>
                  Xin chào! Tôi có thể giúp gì cho bạn?
                </p>
                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  Hãy bắt đầu nhắn tin...
                </p>
              </div>
            ) : (
              <VirtualizedMessageList
                messages={messages}
                isLoading={isLoading}
                onLoadMore={() => { }}
                style={{ flex: 1 }}
              />
            )}

            {/* Typing Indicator */}
            {isLoading && <TypingIndicator isVisible={true} />}

            {/* ✅ Anchor để scroll tới cuối */}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <SuggestionsPanel
              suggestions={suggestions}
              onSelectSuggestion={selectSuggestion}
              isVisible={!isLoading}
              hasHistory={messages.length > 0}
            />
          )}

          {/* Input */}
          <OptimizedMessageInput
            onSendMessage={sendMessage}
            disabled={isLoading}
            placeholder="Nhập tin nhắn..."
          />
        </div>
      </div>
    </div>
  );
}