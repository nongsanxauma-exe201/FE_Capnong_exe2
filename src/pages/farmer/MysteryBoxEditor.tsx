import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Minus, Check, Trash2,
  Sparkles, Gift, ImagePlus, Loader2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { productService, mysteryBoxService, authService, ProductResponse, ProductMysteryRequest } from '../../services/index';
import { globalShowAlert } from '../../contexts/PopupContext';

interface SelectedProduct {
  productId: number;
  productName: string;
  quantity: number;
  imageUrl?: string;
  unit?: string;
  stockQuantity: number;
}

const MysteryBoxEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { boxId } = useParams<{ boxId: string }>();
  const isEditMode = !!boxId;

  const [availableProducts, setAvailableProducts] = useState<ProductResponse[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [boxType, setBoxType] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [price, setPrice] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [boxImage, setBoxImage] = useState<File | null>(null);
  const [boxImagePreview, setBoxImagePreview] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const userRes = await authService.getMyInfo();
        let productsList: ProductResponse[] = [];
        if (userRes.result && userRes.result.id) {
          const res = await productService.getByShopId(Number(userRes.result.id));
          if (res.result) {
            productsList = res.result;
            setAvailableProducts(productsList);
          }
        }
        if (isEditMode && boxId) {
          try {
            const boxRes = await mysteryBoxService.getById(Number(boxId));
            if (boxRes.result) {
              const box = boxRes.result;
              console.log('[MysteryBoxEditor] loaded box:', box);
              setBoxType(box.boxType);
              setDescription(box.description || '');
              setNote(box.note || '');
              setPrice(box.price.toString());
              setTotalQuantity(box.totalQuantity?.toString() || '');
              setBoxImagePreview(box.imageUrl || '');
              setIsActive(box.isActive !== false && box.isActive !== 0);
              if (box.products && box.products.length > 0) {
                // deduplicate by productId (sum quantities if duplicate)
                const deduped = box.products.reduce((acc, bp) => {
                  const existing = acc.find(p => p.productId === bp.productId);
                  if (existing) {
                    existing.quantity += bp.quantity;
                  } else {
                    acc.push({ ...bp });
                  }
                  return acc;
                }, [] as typeof box.products);
                setSelectedProducts(deduped.map(bp => {
                  const full = productsList.find(p => p.id === bp.productId);
                  return {
                    productId: bp.productId,
                    productName: bp.productName,
                    quantity: bp.quantity,
                    imageUrl: full?.imageUrl,
                    unit: full?.unit,
                    stockQuantity: full?.stockQuantity ?? 0,
                  };
                }));
              }
            }
          } catch (boxErr) {
            setError('Không thể tải thông tin túi mù. Vui lòng thử lại.');
          }
        }
      } catch (err) {
        setError('Không thể tải dữ liệu. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [boxId, isEditMode]);

  const addProduct = (product: ProductResponse) => {
    if (selectedProducts.find(p => p.productId === product.id)) return;
    setSelectedProducts(prev => [...prev, {
      productId: product.id,
      productName: product.productName,
      quantity: 1,
      imageUrl: product.imageUrl,
      unit: product.unit,
      stockQuantity: product.stockQuantity,
    }]);
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(prev => prev.map(p => p.productId === productId ? { ...p, quantity } : p));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBoxImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setBoxImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const totalProductsPrice = useMemo(() => {
    return selectedProducts.reduce((sum, p) => {
      const product = availableProducts.find(ap => ap.id === p.productId);
      const effectivePrice = product?.salePrice ?? product?.sellingPrice ?? 0;
      return sum + effectivePrice * p.quantity;
    }, 0);
  }, [selectedProducts, availableProducts]);

  const handleSave = async () => {
    if (!boxType.trim()) { globalShowAlert('Vui lòng nhập tên hộp mù.', 'Nhắc nhở', 'warning'); return; }
    if (!price || Number(price) <= 0) { globalShowAlert('Vui lòng nhập giá hợp lệ.', 'Nhắc nhở', 'warning'); return; }
    if (!totalQuantity || Number(totalQuantity) < 1) { globalShowAlert('Vui lòng nhập số lượng túi bán ra.', 'Nhắc nhở', 'warning'); return; }
    if (selectedProducts.length === 0) { globalShowAlert('Vui lòng chọn ít nhất một sản phẩm.', 'Nhắc nhở', 'warning'); return; }
    const priceNum = Number(price);
    const qtyNum = Number(totalQuantity);
    if (priceNum > totalProductsPrice) {
      globalShowAlert(`Giá bán (${priceNum.toLocaleString('vi-VN')}đ) không được lớn hơn tổng giá trị sản phẩm (${totalProductsPrice.toLocaleString('vi-VN')}đ). Túi mù nên rẻ hơn hoặc bằng giá lẻ.`, 'Cảnh báo', 'warning');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const products: ProductMysteryRequest[] = selectedProducts.map(p => ({ productId: p.productId, quantity: p.quantity }));
      if (isEditMode && boxId) {
        await mysteryBoxService.updateMysteryBox(Number(boxId), { boxType, price: priceNum, description, note, totalQuantity: qtyNum, products, active: isActive }, boxImage || undefined);
      } else {
        await mysteryBoxService.createMysteryBox({ boxType, price: priceNum, description, note, totalQuantity: qtyNum, products }, boxImage || undefined);
      }
      await globalShowAlert(isEditMode ? 'Cập nhật hộp mù thành công!' : 'Tạo hộp mù thành công!', 'Thành công', 'success');
      onBack();
    } catch (err: any) {
      setError(err?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold text-sm transition-colors">
              <ArrowLeft className="size-4" />
              Quay lại
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-black text-gray-900">{isEditMode ? 'Chỉnh Sửa Hộp Mù' : 'Tạo Hộp Mù Mới'}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="size-10 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                  <Gift className="size-5" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Thông tin hộp mù</h3>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-bold flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tên hộp mù *</label>
                  <input type="text" value={boxType} onChange={e => setBoxType(e.target.value)}
                    placeholder="VD: Hộp mù củ quả tươi sạch"
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Giá bán (VND) *</label>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-400 font-bold">Mức giá túi mù</span>
                    <span className={`text-3xl font-black ${totalProductsPrice > 0 && Number(price) > totalProductsPrice ? 'text-red-500' : 'text-primary'}`}>
                      {(Number(price) || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <input
                    type="range" min="10000" max="500000" step="1000"
                    value={Number(price) || 10000}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-primary cursor-pointer mb-2"
                  />
                  <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-2">
                    <span>10.000đ</span>
                    <span>500.000đ</span>
                  </div>
                  <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="Hoặc nhập trực tiếp..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                  {totalProductsPrice > 0 && (
                    <p className="text-xs text-gray-500 mt-2 font-bold">
                      Tổng giá trị sản phẩm: {totalProductsPrice.toLocaleString('vi-VN')}đ
                    </p>
                  )}
                  {totalProductsPrice > 0 && Number(price) > totalProductsPrice && (
                    <p className="text-xs text-red-500 mt-1 font-bold">
                      ⚠ Giá bán không được vượt quá tổng giá trị sản phẩm
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Số lượng túi bán ra *</label>
                  <input type="number" min="1" value={totalQuantity} onChange={e => setTotalQuantity(e.target.value)}
                    placeholder="VD: 10"
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                  <p className="text-xs text-gray-400 mt-2 font-bold">Số túi mù tối đa có thể bán ra</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Ảnh hộp mù</label>
                  <label className="relative flex flex-col items-center justify-center w-full h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group overflow-hidden">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    {boxImagePreview ? (
                      <img src={boxImagePreview} className="w-full h-full object-cover" alt="Ảnh hộp mù" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-primary transition-colors">
                        <ImagePlus className="size-8" />
                        <span className="text-xs font-bold">Click để tải ảnh hộp mù</span>
                      </div>
                    )}
                    {boxImagePreview && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full">Đổi ảnh</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Mô tả</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Mô tả về hộp mù này..." rows={4}
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Ghi chú</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>

                {isEditMode && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                        {isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800">Trạng thái hiển thị</p>
                        <p className="text-xs text-gray-400 font-medium">{isActive ? 'Đang hiển thị cho khách hàng' : 'Đang ẩn khỏi khách hàng'}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setIsActive(prev => !prev)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 size-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Products */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="size-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                  <Sparkles className="size-5" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Sản phẩm đã chọn ({selectedProducts.length})</h3>
              </div>

              {selectedProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="size-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Chưa chọn sản phẩm nào</p>
                  <p className="text-gray-400 text-sm mt-1">Chọn sản phẩm từ danh sách bên phải</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedProducts.map((p) => {
                    const product = availableProducts.find(ap => ap.id === p.productId);
                    return (
                      <div key={p.productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                        <img src={p.imageUrl || `https://picsum.photos/seed/${p.productId}/60/60`}
                          className="size-12 rounded-xl object-cover shadow-sm" />
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-800 line-clamp-1">{p.productName}</p>
                          <p className="text-xs text-primary font-bold">
                            {((product?.salePrice ?? product?.sellingPrice ?? 0) * p.quantity).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(p.productId, p.quantity - 1)}
                            className="size-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 shadow-sm">
                            <Minus className="size-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-black text-gray-800">{p.quantity}</span>
                          <button onClick={() => updateQuantity(p.productId, p.quantity + 1)}
                            className="size-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 shadow-sm">
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <button onClick={() => removeProduct(p.productId)}
                          className="size-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedProducts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Tổng giá trị đơn lẻ:</span>
                    <span className="font-black text-primary">{totalProductsPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Giá bán túi mù:</span>
                    <span className="font-black text-gray-900">{(Number(price) || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {Number(price) > 0 && Number(price) <= totalProductsPrice && (
                    <p className="text-xs text-green-600 font-bold text-right">
                      Tiết kiệm: {(totalProductsPrice - Number(price)).toLocaleString('vi-VN')}đ
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Available Products (sticky) */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-8">
              <h3 className="font-black text-gray-800 uppercase tracking-tight mb-6 flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Sản Phẩm Của Bạn
              </h3>
              {availableProducts.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500 italic">Bạn chưa có sản phẩm nào.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {availableProducts.map((product) => {
                    const isSelected = selectedProducts.some(p => p.productId === product.id);
                    return (
                      <button key={product.id} onClick={() => isSelected ? removeProduct(product.id) : addProduct(product)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white hover:border-primary/30'}`}>
                        <div className="flex items-start gap-3">
                          <img src={product.imageUrl || `https://picsum.photos/seed/${product.id}/60/60`}
                            className="size-12 rounded-lg object-cover flex-shrink-0 bg-gray-50" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 mb-1 truncate">{product.productName}</p>
                            <p className="text-xs text-gray-500 mb-1">Tồn: {(product.stockKg ?? product.stockQuantity).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg</p>
                            <p className="text-xs font-bold text-primary">{((product.pricePerKg ?? product.sellingPrice) || 0).toLocaleString('vi-VN')}đ/kg</p>
                          </div>
                          {isSelected && (
                            <div className="size-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <Check className="size-3 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <button onClick={handleSave} disabled={isSaving}
                className="mt-6 w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50">
                {isSaving ? <><Loader2 className="size-4 animate-spin" />Đang lưu...</> : <><Save className="size-4" />{isEditMode ? 'CẬP NHẬT HỘP MÙ' : 'TẠO HỘP MÙ'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MysteryBoxEditor;
