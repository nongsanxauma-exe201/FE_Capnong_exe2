/**
 * Virtualized Message List Component
 */

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { ChatMessage } from './chatbot.types';
import { useVirtualScrolling, useAutoScroll } from './hooks/useVirtualScrolling';
import { useMessageMemoryManagement } from './hooks/useMemoryManagement';
import { MessageBubble } from './MessageBubble';

export interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  className?: string;
  style?: React.CSSProperties;
  autoScroll?: boolean;
  itemHeight?: number;
  containerHeight?: number;
}

const ITEM_HEIGHT = 100;
const CONTAINER_HEIGHT = 500;

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = memo(({
  messages: rawMessages,
  isLoading = false,
  onLoadMore,
  className = '',
  style = {},
  autoScroll = true,
  itemHeight = ITEM_HEIGHT,
  containerHeight = CONTAINER_HEIGHT
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [actualContainerHeight, setActualContainerHeight] = React.useState(containerHeight || CONTAINER_HEIGHT);

  useEffect(() => {
    if (containerHeight) {
      setActualContainerHeight(containerHeight);
      return;
    }

    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setActualContainerHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerHeight]);

  const { messages, memoryUsage } = useMessageMemoryManagement(rawMessages, {
    maxMessages: 1000,
    enableAutoCleanup: true
  });

  const { onScroll } = useVirtualScrolling({
    itemHeight,
    containerHeight: actualContainerHeight,
    totalItems: messages.length,
    overscan: 5
  });

  const scrollToBottom = useAutoScroll(messages.length, autoScroll);
  const prevMessageCountRef = useRef(messages.length);

  // ✅ Scroll xuống cuối khi component mount lần đầu
  useEffect(() => {
    if (scrollElementRef.current && messages.length > 0) {
      scrollElementRef.current.scrollTop = scrollElementRef.current.scrollHeight;
    }
  }, []); // chỉ chạy 1 lần khi mount

  // ✅ Scroll xuống khi có tin nhắn mới
  useEffect(() => {
    if (autoScroll && scrollElementRef.current && messages.length > prevMessageCountRef.current) {
      scrollToBottom(scrollElementRef.current);
      prevMessageCountRef.current = messages.length;
    } else if (messages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length, autoScroll, scrollToBottom]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    onScroll(target.scrollTop);
    if (target.scrollTop === 0 && onLoadMore) {
      onLoadMore();
    }
  }, [onScroll, onLoadMore]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ChatBot Memory Usage:', memoryUsage);
    }
  }, [memoryUsage]);

  return (
    <div
      ref={containerRef}
      className={`virtualized-message-list ${className}`}
      style={{
        height: containerHeight || '100%',
        flex: containerHeight ? undefined : 1,
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <div
        ref={scrollElementRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div style={{ padding: '12px 16px' }}>
          {messages.map((message) => (
            <div key={message.id} style={{ marginBottom: '12px' }}>
              <MessageBubble message={message} />
            </div>
          ))}
        </div>

        {messages.length === 0 && !isLoading && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontStyle: 'italic'
          }}>
            Hãy bắt đầu trò chuyện với Chat Box!
          </div>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          borderRadius: '0 0 0 4px'
        }}>
          {memoryUsage.messageCount} msgs, {memoryUsage.estimatedKB}KB
        </div>
      )}
    </div>
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';

export default VirtualizedMessageList;