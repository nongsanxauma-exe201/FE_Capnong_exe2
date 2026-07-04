/**
 * ChatBot Button Component
 * Floating action button to toggle chat interface
 */

import React from 'react';
import { useChatBotContext } from './ChatBotContext';
import styles from './ChatBot.module.css';

interface ChatBotButtonProps {
  unreadCount?: number;
  className?: string;
}

export function ChatBotButton({ unreadCount = 0, className = '' }: ChatBotButtonProps) {
  const { isOpen, toggleChat } = useChatBotContext();
  if (isOpen) return null;

  return (
    <button
      onClick={toggleChat}
      className={`
        ${styles['chatbot-button']}
        ${isOpen ? styles['is-open'] : ''}
        ${className}
      `}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      title={isOpen ? 'Close chat' : 'Open chat'}
    >
      {/* Chat Icon */}
      <svg
        className={styles['chatbot-button-icon']}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isOpen ? (
          // Close icon (X)
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          // Robot/Bot icon
          <>
            <rect x="4" y="8" width="16" height="12" rx="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12h.01M15 12h.01" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 16h6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V5M12 5L10 7M12 5L14 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}
      </svg>

      {/* Notification Badge */}
      {unreadCount > 0 && !isOpen && (
        <span
          className={styles['chatbot-notification-badge']}
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* Screen Reader Text */}
      <span className={styles['chatbot-sr-only']}>
        {isOpen ? 'Đóng Chat Box' : 'Mở Chat Box'}
      </span>
    </button>
  );
}