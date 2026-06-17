import React, { useEffect, useState } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Info, ArrowRight, ArrowLeft, Loader2, Package, Gift, ChefHat, AlertCircle } from 'lucide-react';
import { cartService, CartResponse, CartItemResponse } from '../../services/cart.service';
import { globalShowConfirm, globalShowAlert } from '../../contexts/PopupContext';

interface CartProps {
  onProceedToCheckout: (selectedKeys?: string[]) => void;
  onBackToShopping: () => void;
}

type GroupedCart = Record<string, CartItemResponse[]>;

interface CartState {
  cart: CartResponse | null;
  groupedItems: GroupedCart;
}

const Cart: React.FC<CartProps> = ({ onProceedToCheckout, onBackToShopping }) => {
  const [cartState, setCartState] = useState<CartState>({ cart: null, groupedItems: {} });
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const fetchCart = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const resp = await cartService.getCart();
      const cartData = resp.result;
      if (!cartData) { setCartState({ cart: null, groupedItems: {} }); return; }
      const grouped = cartData.items.reduce((acc: GroupedCart, item) => {
        const key = item.shopName || 'Nông Trại Khác';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
      setCartState({ cart: cartData, groupedItems: grouped });
      // Auto-select tất cả khi load lần đầu
      if (!isSilent) {
        const allKeys = cartData.items.map(item => {
          const type = item.itemType || '';
          let id: any = null;
          if (type === 'MYSTERY_BOX') id = item.mysteryBoxId || (item as any).id;
          else if (type === 'BUILD_COMBO' || type === 'COMBO') id = item.buildComboId || (item as any).comboId || (item as any).id;
          else id = item.productId || (item as any).id;
          if (type === 'MYSTERY_BOX') return `b-${id}`;
          if (type === 'BUILD_COMBO' || type === 'COMBO') return `c-${id}`;
          return `p-${id}`;
        });
        setSelectedKeys(new Set(allKeys));
      }
    } catch (error) {
      console.error('Failed to load cart', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    const handleCartUpdate = () => fetchCart(true);
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const itemKey = (item: CartItemResponse) => {
    const type = item.itemType || '';
    let id: any = null;
    if (type === 'MYSTERY_BOX') id = item.mysteryBoxId || (item as any).id || (item as any).mysteryBoxId;
    else if (type === 'BUILD_COMBO' || type === 'COMBO') id = item.buildComboId || (item as any).comboId || (item as any).id;
    else id = item.productId || (item as any).id || (item as any).productId;

    if (type === 'MYSTERY_BOX') return `b-${id}`;
    if (type === 'BUILD_COMBO' || type === 'COMBO') return `c-${id}`;
    return `p-${id}`;
  };

  const handleToggleItem = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleShop = (shopName: string, items: CartItemResponse[]) => {
    const shopItemKeys = items.map(itemKey);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      const allSelected = shopItemKeys.every(k => next.has(k));
      if (allSelected) {
        shopItemKeys.forEach(k => next.delete(k));
      } else {
        shopItemKeys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  const handleUpdateQuantity = async (item: CartItemResponse, change: number) => {
    const currentQty = Number(item.quantity) || 0;
    const newQty = currentQty + change;
    if (newQty < 1) return;

    const key = itemKey(item);
    setUpdatingKey(key);
    try {
      const type = (item.itemType || '').toUpperCase();
      
      if (type === 'MYSTERY_BOX') {
        const id = item.mysteryBoxId || (item as any).id;
        if (id) await cartService.updateMysteryBoxQuantity(Number(id), newQty);
      } else if (type === 'BUILD_COMBO' || type === 'COMBO') {
        const id = item.buildComboId || (item as any).comboId || (item as any).id;
        if (id) await cartService.updateComboQuantity(Number(id), newQty);
      } else {
        const id = item.productId || (item as any).id;
        if (id) await cartService.updateQuantity(Number(id), newQty);
      }
      await fetchCart(true);
      window.dispatchEvent(new Event('cart-updated'));
    } catch (error) {
      console.error('Update quantity failed', error);
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleRemoveItem = async (item: CartItemResponse) => {
    const key = itemKey(item);
    setUpdatingKey(key);
    try {
      const type = (item.itemType || '').toUpperCase();
      const mysteryBoxId = item.mysteryBoxId || (type === 'MYSTERY_BOX' ? (item as any).id : null);
      const buildComboId = item.buildComboId || ((type === 'BUILD_COMBO' || type === 'COMBO') ? ((item as any).comboId || (item as any).id) : null);
      const productId = item.productId || (type === 'PRODUCT' ? (item as any).id : null);

      if (type === 'MYSTERY_BOX' && mysteryBoxId) {
        await cartService.removeMysteryBox(mysteryBoxId);
      } else if ((type === 'BUILD_COMBO' || type === 'COMBO') && buildComboId) {
        await cartService.removeCombo(buildComboId);
      } else if (productId) {
        await cartService.removeItem(productId);
      }
      await fetchCart(true);
      window.dispatchEvent(new Event('cart-updated'));
    } catch (error) {
      console.error('Remove item failed', error);
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleClearCart = async () => {
    if (!await globalShowConfirm('Bạn có chắc chắn muốn xóa tất cả sản phẩm khỏi giỏ hàng?')) return;
    setLoading(true);
    try {
      await cartService.clearCart();
      setSelectedKeys(new Set());
      await fetchCart();
      window.dispatchEvent(new Event('cart-updated'));
    } catch (error) {
      console.error('Clear cart failed', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !cartState.cart) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-primary">
          <Loader2 className="size-8 animate-spin" />
          <p className="font-bold">Đang tải giỏ hàng...</p>
        </div>
      </div>
    );
  }

  const { cart, groupedItems } = cartState;
  const totalItems = cart?.items.length || 0;
  
  const selectedItems = cart?.items.filter(it => selectedKeys.has(itemKey(it))) || [];
  const selectedTotal = selectedItems.reduce((sum, it) => sum + ((it.salePrice ?? it.price) * it.quantity), 0);
  const selectedShops = Array.from(new Set(selectedItems.map(it => it.shopName)));
  const isMultiShop = selectedShops.length > 1;
  const shopsCount = Object.keys(groupedItems).length;

  const handleCheckout = () => {
    if (selectedKeys.size === 0) {
      globalShowAlert('Vui lòng chọn ít nhất một sản phẩm để thanh toán', 'Thông báo', 'info');
      return;
    }
    if (isMultiShop) {
      globalShowAlert('Hệ thống hiện tại chưa hỗ trợ gộp đơn từ nhiều nhà vườn. Vui lòng chỉ chọn sản phẩm từ một nhà vườn để thanh toán.', 'Không thể gộp đơn', 'warning');
      return;
    }
    // Chuyển sang checkout với các key đã chọn
    onProceedToCheckout(Array.from(selectedKeys));
  };

  return (
    <div className="bg-background pb-20 animate-in fade-in duration-500">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-12">

        <button onClick={onBackToShopping} className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="size-5" />
          <span className="font-bold text-sm">Quay lại mua sắm</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black text-gray-900 font-display">Giỏ Hàng Của Bạn</h1>
            {totalItems > 0
              ? <p className="text-gray-400 font-bold">Bạn có {totalItems} sản phẩm từ {shopsCount} nhà vườn khác nhau</p>
              : <p className="text-gray-400 font-bold">Giỏ hàng của bạn đang trống</p>
            }
          </div>
          {totalItems > 0 && (
            <div className="flex items-center gap-6">
              <button 
                onClick={() => {
                  if (selectedKeys.size === totalItems) setSelectedKeys(new Set());
                  else {
                    const allKeys = cart?.items.map(itemKey) || [];
                    setSelectedKeys(new Set(allKeys));
                  }
                }}
                className="text-xs font-bold text-primary hover:opacity-80 uppercase tracking-widest"
              >
                {selectedKeys.size === totalItems ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              <button onClick={handleClearCart} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-2">
                <Trash2 className="size-4" /> Xóa tất cả
              </button>
            </div>
          )}
        </div>

        {totalItems === 0 ? (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center justify-center">
            <div className="size-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
              <ShoppingCart className="size-10" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Chưa có sản phẩm nào!</h3>
            <p className="text-gray-500 mb-8 max-w-sm">Hãy khám phá thêm các loại nông sản tươi ngon đang chờ bạn mang về nhé.</p>
            <button onClick={onBackToShopping} className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95">
              Khám phá Nông sản ngay
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* Danh sách sản phẩm */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {Object.entries(groupedItems).map(([shopName, items]) => {
                const shopKeys = items.map(itemKey);
                const isShopSelected = shopKeys.every(k => selectedKeys.has(k));
                const isShopPartial = !isShopSelected && shopKeys.some(k => selectedKeys.has(k));

                return (
                  <div key={shopName} className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={isShopSelected}
                          ref={el => {
                            if (el) el.indeterminate = isShopPartial;
                          }}
                          onChange={() => handleToggleShop(shopName, items)}
                          className="size-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{shopName}</h3>
                      </div>
                    </div>
                    <div className="p-8 space-y-8">
                      {items.map((item, idx) => {
                        const key = itemKey(item);
                        const isUpdating = updatingKey === key;
                        const isMysteryBox = item.itemType === 'MYSTERY_BOX';
                        const isCombo = item.itemType === 'BUILD_COMBO' || item.itemType === 'COMBO';
                        return (
                          <div key={key} className={`flex items-center gap-6 ${idx > 0 ? 'pt-6 border-t border-gray-50' : ''}`}>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={selectedKeys.has(key)}
                                onChange={() => handleToggleItem(key)}
                                className="size-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                              />
                              <div className="size-24 rounded-[32px] overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 relative">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.productName} />
                                ) : isMysteryBox ? (
                                  <div className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
                                    <Package className="size-10 text-green-300" />
                                  </div>
                                ) : isCombo ? (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                                    <ChefHat className="size-10 text-emerald-300" />
                                  </div>
                                ) : (
                                  <img src={`https://picsum.photos/seed/${item.productId}/120/120`} className="w-full h-full object-cover" alt={item.productName} />
                                )}
                                {isMysteryBox && (
                                  <div className="absolute -top-1 -right-1 size-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                                    <Gift className="size-3 text-white" />
                                  </div>
                                )}
                                {isCombo && (
                                  <div className="absolute -top-1 -right-1 size-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                    <ChefHat className="size-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="text-[10px] font-black text-primary uppercase mb-1">
                                    {isMysteryBox ? '🎁 Túi mù nông sản' : isCombo ? '🍳 Combo nấu ăn' : 'Nông sản'}
                                  </p>
                                  <h4 className="text-lg font-black text-gray-900">{item.productName}</h4>
                                </div>
                                <div className="text-right">
                                  {item.salePrice != null && item.discountPercent ? (
                                    <div>
                                      <p className="text-xs font-bold text-red-400 line-through">{(item.price || 0).toLocaleString('vi-VN')}đ</p>
                                      <div className="flex items-center justify-end gap-1.5">
                                        <span className="text-lg font-black text-primary">{item.salePrice.toLocaleString('vi-VN')}đ</span>
                                        <span className="text-[9px] font-black text-white bg-primary rounded-full px-1.5 py-0.5">-{item.discountPercent}%</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-lg font-black text-primary">{(item.price || 0).toLocaleString('vi-VN')}đ</p>
                                  )}
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {isMysteryBox ? 'Mỗi túi' : isCombo ? 'Mỗi combo' : 'Mỗi đơn vị'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                                  <button disabled={isUpdating || item.quantity <= 1} onClick={() => handleUpdateQuantity(item, -1)} className="size-8 flex items-center justify-center text-gray-400 hover:text-primary disabled:opacity-50">
                                    <Minus className="size-3" />
                                  </button>
                                  <span className="text-sm font-black text-gray-900 w-4 text-center">
                                    {isUpdating ? <Loader2 className="size-3 animate-spin mx-auto text-primary" /> : item.quantity}
                                  </span>
                                  <button disabled={isUpdating} onClick={() => handleUpdateQuantity(item, 1)} className="size-8 flex items-center justify-center text-gray-400 hover:text-primary disabled:opacity-50">
                                    <Plus className="size-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-xl font-black text-primary">{(((item.salePrice ?? item.price) || 0) * item.quantity).toLocaleString('vi-VN')}đ</span>
                                  <button disabled={isUpdating} onClick={() => handleRemoveItem(item)} className="size-10 bg-red-50 rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tóm tắt đơn hàng */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 flex flex-col gap-8">
                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tóm tắt đơn hàng</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                    <span>Đã chọn ({selectedKeys.size} sản phẩm)</span>
                    <span className="text-gray-900 font-black">{selectedTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                    <span>Số nhà vườn</span>
                    <span className="text-gray-900 font-black">{selectedShops.length}</span>
                  </div>
                </div>

                {isMultiShop && (
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                    <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-600 font-bold leading-relaxed">
                      Lưu ý: Bạn chỉ có thể thanh toán sản phẩm từ một nhà vườn trong mỗi lần đặt hàng. Vui lòng lọc lại lựa chọn.
                    </p>
                  </div>
                )}

                <div className="pt-8 border-t border-gray-50 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tạm tính</p>
                    <h3 className="text-3xl font-black text-primary">
                      {selectedTotal.toLocaleString('vi-VN')}đ
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold italic mt-1">Chưa bao gồm phí vận chuyển</p>
                  </div>
                </div>

                <button 
                  onClick={handleCheckout} 
                  disabled={selectedKeys.size === 0 || isMultiShop}
                  className="w-full py-5 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  {isMultiShop ? 'Không thể gộp đơn' : 'Tiến hành đặt hàng'} <ArrowRight className="size-5" />
                </button>
                <button onClick={onBackToShopping} className="text-sm font-black text-primary hover:underline mx-auto uppercase tracking-widest">
                  Tiếp tục mua sắm
                </button>
              </div>

              <div className="p-8 bg-green-50/50 rounded-[32px] border border-primary/5 flex items-start gap-4">
                <div className="size-8 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
                  <Info className="size-4" />
                </div>
                <div>
                  <h5 className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Phí vận chuyển</h5>
                  <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                    Phí ship được tính tự động dựa theo khoảng cách từ nhà vườn đến địa chỉ của bạn, hiển thị tại bước thanh toán.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;