import React from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ChatMessage,
  ProductSuggestion,
  MessageBubbleProps,
} from './chatbot.types';
import { useChatBotContext } from './ChatBotContext';
import type { AiCartItem, AiItemOption } from '../../services/chatbot.service';
import { notifyCartUpdated } from '../../services/cart.service';

const markdownComponents = {
  p: ({ children }: any) => (
    <p style={{ margin: '2px 0', lineHeight: '1.6' }}>{children}</p>
  ),
  ul: ({ children }: any) => (
    <ul style={{ paddingLeft: '16px', margin: '4px 0' }}>{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol style={{ paddingLeft: '16px', margin: '4px 0' }}>{children}</ol>
  ),
  li: ({ children }: any) => (
    <li style={{ margin: '2px 0', lineHeight: '1.6' }}>{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong style={{ fontWeight: 700 }}>{children}</strong>
  ),
  h1: ({ children }: any) => (
    <h1 style={{ fontSize: '15px', fontWeight: 700, margin: '8px 0 4px' }}>{children}</h1>
  ),
  h2: ({ children }: any) => (
    <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '6px 0 3px' }}>{children}</h2>
  ),
  h3: ({ children }: any) => (
    <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '4px 0 2px' }}>{children}</h3>
  ),
};

const formatPrice = (price?: number) =>
  price != null ? `${Number(price).toLocaleString('vi-VN')}đ` : '';

const getItemDetailPath = (item: { itemType?: string; itemId: number }) =>
  item.itemType === 'MYSTERY_BOX'
    ? `/mystery-box/${item.itemId}`
    : `/product/${item.itemId}`;

const isMatch = (productName: string, line: string): boolean => {
  const name = productName.toLowerCase().trim();
  const text = line.toLowerCase().trim();

  if (!text || text.length < 2) return false;
  if (text.includes(name)) return true;

  const nameWords = name.split(' ').filter(w => w.length >= 3);
  if (nameWords.length > 0 && nameWords.every(w => text.includes(w))) return true;

  return false;
};

interface InlineProductCardProps {
  product: ProductSuggestion;
  onClick: () => void;
}

const InlineProductCard: React.FC<InlineProductCardProps> = ({ product, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      backgroundColor: '#fff',
      border: '1px solid #e8f5e9',
      borderRadius: '10px',
      padding: '8px 12px',
      marginTop: '6px',
      cursor: 'pointer',
      boxShadow: '0 1px 4px rgba(76,175,80,0.08)',
      transition: 'all 0.15s ease',
      width: '100%',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.boxShadow = '0 4px 12px rgba(76,175,80,0.2)';
      el.style.borderColor = '#4CAF50';
      el.style.transform = 'translateY(-1px)';
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement;
      el.style.boxShadow = '0 1px 4px rgba(76,175,80,0.08)';
      el.style.borderColor = '#e8f5e9';
      el.style.transform = 'translateY(0)';
    }}
  >
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: '22px' }}>🥬</span>
      )}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: 600,
          color: '#222',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {product.name}
      </p>
      {product.category && (
        <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#999' }}>
          {product.category}
        </p>
      )}
      {product.salePrice != null && product.discountPercent ? (
        <div>
          <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textDecoration: 'line-through' }}>
            {formatPrice(product.price)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#29a33d' }}>
              {formatPrice(product.salePrice)}
            </p>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff', backgroundColor: '#29a33d', borderRadius: '99px', padding: '1px 5px' }}>
              -{product.discountPercent}%
            </span>
          </div>
        </div>
      ) : (
        <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 700, color: '#29a33d' }}>
          {formatPrice(product.price)}
        </p>
      )}
    </div>

    <div
      style={{
        backgroundColor: '#4CAF50',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      Xem →
    </div>
  </div>
);

interface ItemOptionCardProps {
  option: AiItemOption;
  index: number;
  onSelect: (index: number) => void;
  onView: () => void;
}

const ItemOptionCard: React.FC<ItemOptionCardProps> = ({
  option,
  index,
  onSelect,
  onView,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      backgroundColor: '#fff',
      border: '1px solid #e8f5e9',
      borderRadius: '10px',
      padding: '8px 12px',
      marginTop: '8px',
      width: '100%',
    }}
  >
    <div
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: '#4CAF50',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {index}
    </div>

    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
      onClick={onView}
    >
      {option.imageUrl ? (
        <img
          src={option.imageUrl}
          alt={option.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: '22px' }}>
          {option.itemType === 'MYSTERY_BOX' ? '🎁' : '🥬'}
        </span>
      )}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: 600,
          color: '#222',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {option.name}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#888' }}>
        {option.itemType === 'MYSTERY_BOX' ? 'Túi mù' : 'Sản phẩm'}
        {option.unit ? ` • ${option.unit}` : ''}
      </p>
      {option.salePrice != null && option.discountPercent ? (
        <div>
          <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 600, color: '#9ca3af', textDecoration: 'line-through' }}>
            {formatPrice(option.price)}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#29a33d' }}>
              {formatPrice(option.salePrice)}
            </p>
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff', backgroundColor: '#29a33d', borderRadius: '99px', padding: '1px 5px' }}>
              -{option.discountPercent}%
            </span>
          </div>
        </div>
      ) : (
        <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 700, color: '#29a33d' }}>
          {formatPrice(option.price)}
        </p>
      )}
    </div>

    <button
      type="button"
      onClick={() => onSelect(index)}
      style={{
        backgroundColor: '#4CAF50',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        flexShrink: 0,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      Chọn
    </button>
  </div>
);

const CartItemRow: React.FC<{ item: AiCartItem; onView: () => void }> = ({
  item,
  onView,
}) => (
  <div
    onClick={onView}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 0',
      borderBottom: '1px solid #f0f0f0',
      cursor: 'pointer',
    }}
  >
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        flexShrink: 0,
      }}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.itemType === 'MYSTERY_BOX' ? '🎁' : '🥬'}
        </div>
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{item.name}</p>
      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#666' }}>
        {item.quantity}
        {item.unit ? ` ${item.unit}` : ''} × {formatPrice(item.unitPrice)}
      </p>
    </div>
    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#E53935' }}>
      {formatPrice(item.totalPrice)}
    </p>
  </div>
);

const renderContentWithProducts = (
  content: string,
  products: ProductSuggestion[],
  navigate: (path: string) => void
) => {
  if (!products || products.length === 0) {
    return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>;
  }

  const lines = content.split('\n');
  const renderedProductIds = new Set<number>();

  return (
    <div>
      {lines.map((line, index) => {
        const matched = products.filter(
          p => !renderedProductIds.has(p.id) && isMatch(p.name, line)
        );
        matched.forEach(p => renderedProductIds.add(p.id));

        return (
          <div key={index}>
            {line.trim() && (
              <ReactMarkdown components={markdownComponents}>{line}</ReactMarkdown>
            )}
            {matched.length > 0 && (
              <div style={{ marginBottom: '6px' }}>
                {matched.map(product => (
                  <InlineProductCard
                    key={product.id}
                    product={product}
                    onClick={() => navigate(`/product/${product.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const navigate = useNavigate();
  const { sendMessage, isLoading, toggleChat, isOpen } = useChatBotContext();
  const isUser = message.sender === 'user';

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const handleSelectOption = (index: number) => {
    if (isLoading) return;
    sendMessage(String(index));
  };

  const goToCart = () => {
    notifyCartUpdated();
    if (isOpen) toggleChat();
    navigate('/cart');
  };

  const goToCheckout = () => {
    notifyCartUpdated();
    if (isOpen) toggleChat();
    navigate('/checkout');
  };

  const renderBotExtras = () => {
    if (message.responseType === 'ITEM_OPTIONS' && message.itemOptions?.length) {
      return (
        <div style={{ marginTop: '10px' }}>
          {message.itemOptions.map((option, idx) => (
            <ItemOptionCard
              key={`${option.itemType}-${option.itemId}-${idx}`}
              option={option}
              index={idx + 1}
              onSelect={handleSelectOption}
              onView={() => navigate(getItemDetailPath(option))}
            />
          ))}
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#888' }}>
            Hoặc gõ số (ví dụ: 1) để chọn nhanh
          </p>
        </div>
      );
    }

    if (message.responseType === 'CART_UPDATED' && message.cart?.items?.length) {
      return (
        <div
          style={{
            marginTop: '10px',
            backgroundColor: '#f8faf8',
            border: '1px solid #e8f5e9',
            borderRadius: '10px',
            padding: '10px 12px',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#2e7d32' }}>
            Giỏ hàng vừa cập nhật
          </p>
          {message.cart.items.map(item => (
            <CartItemRow
              key={`${item.itemType}-${item.itemId}`}
              item={item}
              onView={() => navigate(getItemDetailPath(item))}
            />
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Tổng</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#E53935' }}>
              {formatPrice(message.cart.totalAmount)}
            </span>
          </div>
          <button
            type="button"
            onClick={goToCart}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#4CAF50',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Xem giỏ hàng
          </button>
        </div>
      );
    }

    if (message.responseType === 'PRODUCT_DETAIL' && message.selectedProduct) {
      const product = message.selectedProduct;
      return (
        <div style={{ marginTop: '10px' }}>
          <ItemOptionCard
            option={product}
            index={1}
            onSelect={() => navigate(getItemDetailPath(product))}
            onView={() => navigate(getItemDetailPath(product))}
          />
          <button
            type="button"
            onClick={() => navigate(getItemDetailPath(product))}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#4CAF50',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Xem trang chi tiết
          </button>
        </div>
      );
    }

    if (message.responseType === 'NAVIGATION' && message.navigation) {
      return (
        <div style={{ marginTop: '10px' }}>
          {message.cart?.items?.length ? (
            <div
              style={{
                marginBottom: '10px',
                backgroundColor: '#f8faf8',
                border: '1px solid #e8f5e9',
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              {message.cart.items.map(item => (
                <CartItemRow
                  key={`${item.itemType}-${item.itemId}`}
                  item={item}
                  onView={() => navigate(getItemDetailPath(item))}
                />
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #e0e0e0',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Tổng</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#E53935' }}>
                  {formatPrice(message.cart.totalAmount)}
                </span>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(message.navigation!.url)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#2196F3',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {message.navigation.label}
          </button>
        </div>
      );
    }

    if (message.responseType === 'CHECKOUT_DRAFT' && message.checkout) {
      return (
        <div
          style={{
            marginTop: '10px',
            backgroundColor: '#fff8e1',
            border: '1px solid #ffe082',
            borderRadius: '10px',
            padding: '12px',
          }}
        >
          <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600 }}>
            Tổng thanh toán: {formatPrice(message.checkout.totalAmount)}
          </p>
          <button
            type="button"
            onClick={goToCheckout}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#ff9800',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Đi tới thanh toán
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        margin: '8px 0',
      }}
    >
      {!isUser && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
            marginLeft: '2px',
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: '#4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            AI
          </div>
          <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>
            Trợ lý AI
          </span>
        </div>
      )}

      <div
        style={{
          maxWidth: '88%',
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          backgroundColor: isUser ? '#4CAF50' : '#fff',
          color: isUser ? '#fff' : '#222',
          fontSize: '14px',
          lineHeight: '1.6',
          wordBreak: 'break-word',
          boxShadow: isUser
            ? '0 2px 8px rgba(76,175,80,0.25)'
            : '0 1px 4px rgba(0,0,0,0.08)',
          border: isUser ? 'none' : '1px solid #f0f0f0',
        }}
      >
        {isUser
          ? message.content
          : (
            <>
              {renderContentWithProducts(
                message.content,
                message.suggestedProducts ?? [],
                navigate
              )}
              {renderBotExtras()}
            </>
          )}
      </div>

      <div
        style={{
          fontSize: '11px',
          color: '#bbb',
          marginTop: '3px',
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          marginLeft: isUser ? 0 : '4px',
        }}
      >
        <span>{formatTime(message.timestamp)}</span>
        {isUser && (
          <span>
            {message.status === 'sending' && '⏳'}
            {message.status === 'sent' && '✓✓'}
            {message.status === 'error' && '❌'}
          </span>
        )}
      </div>
    </div>
  );
};
