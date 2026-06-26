import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Minus, Check, Trash2,
  ChefHat, Sparkles, Loader2, AlertCircle, MapPin, Camera
} from 'lucide-react';
import { productService, comboService, authService, ProductResponse, Region } from '../../services/index';
import { globalShowAlert } from '../../contexts/PopupContext';

interface SelectedIngredient {
  productId: number;
  productName: string;
  quantity: number;
}

const ComboBuilder: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { comboId } = useParams<{ comboId: string }>();
  const isEditMode = !!comboId;

  const [availableProducts, setAvailableProducts] = useState<ProductResponse[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [comboName, setComboName] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboRegion, setComboRegion] = useState<Region | ''>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comboImage, setComboImage] = useState<File | null>(null);
  const [comboImagePreview, setComboImagePreview] = useState<string>('');

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
        if (isEditMode) {
          const comboRes = await comboService.getById(Number(comboId));
          if (comboRes.result) {
            const combo = comboRes.result;
            setComboName(combo.comboName);
            setComboDescription(combo.description || '');
            setComboPrice(combo.discountPrice.toString());
            setComboRegion(combo.region || '');
            if (combo.imageUrl) setComboImagePreview(combo.imageUrl);
            setSelectedIngredients(combo.items.map(item => ({
              productId: item.productId,
              productName: productsList.find(p => p.id === item.productId)?.productName || `Sản phẩm #${item.productId}`,
              quantity: item.quantity
            })));
          }
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [comboId, isEditMode]);

  const totalIngredientsPrice = useMemo(() => {
    return selectedIngredients.reduce((total, ing) => {
      const product = availableProducts.find(p => p.id === ing.productId);
      return total + (product?.sellingPrice ?? 0) * ing.quantity;
    }, 0);
  }, [selectedIngredients, availableProducts]);

  const handleAddIngredient = (productId: number) => {
    const existing = selectedIngredients.find(ing => ing.productId === productId);
    if (existing) {
      setSelectedIngredients(selectedIngredients.map(ing =>
        ing.productId === productId ? { ...ing, quantity: ing.quantity + 1 } : ing
      ));
    } else {
      const product = availableProducts.find(p => p.id === productId);
      if (product) {
        setSelectedIngredients([...selectedIngredients, { productId, productName: product.productName, quantity: 1 }]);
      }
    }
  };

  const handleRemoveIngredient = (productId: number) => {
    setSelectedIngredients(selectedIngredients.filter(ing => ing.productId !== productId));
  };

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveIngredient(productId);
    } else {
      setSelectedIngredients(selectedIngredients.map(ing =>
        ing.productId === productId ? { ...ing, quantity } : ing
      ));
    }
  };

  const handleSave = async () => {
    if (!comboName.trim()) { globalShowAlert('Vui lòng nhập tên combo.', 'Nhắc nhở', 'warning'); return; }
    if (!comboPrice || Number(comboPrice) <= 0) { globalShowAlert('Vui lòng nhập giá hợp lệ.', 'Nhắc nhở', 'warning'); return; }
    if (selectedIngredients.length === 0) { globalShowAlert('Vui lòng chọn ít nhất một nguyên liệu.', 'Nhắc nhở', 'warning'); return; }
    const priceNum = Number(comboPrice);
    if (priceNum > totalIngredientsPrice) {
      globalShowAlert(`Giá bán combo (${priceNum.toLocaleString('vi-VN')}đ) không được lớn hơn tổng giá trị nguyên liệu (${totalIngredientsPrice.toLocaleString('vi-VN')}đ). Combo nên rẻ hơn hoặc bằng giá lẻ.`, 'Cảnh báo', 'warning');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        comboName,
        description: comboDescription,
        discountPrice: priceNum,
        type: 'CUSTOM' as const,
        region: comboRegion || undefined,
        items: selectedIngredients.map(ing => ({ productId: ing.productId, quantity: ing.quantity }))
      };
      console.log('[ComboBuilder] Sending payload:', JSON.stringify(payload, null, 2));
      if (isEditMode) {
        await comboService.update(Number(comboId), payload, comboImage || undefined);
      } else {
        await comboService.create(payload, comboImage || undefined);
      }
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold text-sm transition-colors">
              <ArrowLeft className="size-4" />
              Quay lại
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-black text-gray-900">{isEditMode ? 'Chỉnh Sửa Combo' : 'Tạo Combo Nấu Ăn'}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <ChefHat className="size-5" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Thông tin combo</h3>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-bold flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tên combo *</label>
                  <input type="text" value={comboName} onChange={e => setComboName(e.target.value)}
                    placeholder="VD: Combo Salad Tươi Mát"
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    <span className="flex items-center gap-2"><MapPin className="size-3" />Vùng miền</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'MIEN_BAC', label: '🌿 Miền Bắc' },
                      { value: 'MIEN_TRUNG', label: '🌶 Miền Trung' },
                      { value: 'MIEN_NAM', label: '🥥 Miền Nam' },
                    ] as { value: Region; label: string }[]).map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setComboRegion(prev => prev === opt.value ? '' : opt.value)}
                        className={`py-3 px-2 rounded-2xl text-xs font-black border-2 transition-all ${comboRegion === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-primary/30'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Giá combo (VND) *</label>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-400 font-bold">Mức giá combo</span>
                    <span className={`text-3xl font-black ${totalIngredientsPrice > 0 && Number(comboPrice) > totalIngredientsPrice ? 'text-red-500' : 'text-primary'}`}>
                      {(Number(comboPrice) || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="500000"
                    step="1000"
                    value={Number(comboPrice) || 10000}
                    onChange={e => setComboPrice(e.target.value)}
                    className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-primary cursor-pointer mb-2"
                  />
                  <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase mb-2">
                    <span>10.000đ</span>
                    <span>500.000đ</span>
                  </div>
                  <input type="number" min="0" value={comboPrice} onChange={e => setComboPrice(e.target.value)}
                    placeholder="Hoặc nhập trực tiếp..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                  {totalIngredientsPrice > 0 && (
                    <p className="text-xs text-gray-500 mt-2 font-bold">
                      Tổng giá trị nguyên liệu: {totalIngredientsPrice.toLocaleString('vi-VN')}đ
                    </p>
                  )}
                  {totalIngredientsPrice > 0 && Number(comboPrice) > totalIngredientsPrice && (
                    <p className="text-xs text-red-500 mt-1 font-bold">
                      ⚠ Giá combo không được vượt quá tổng giá trị nguyên liệu
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Ảnh combo</label>
                  <label className="relative flex flex-col items-center justify-center w-full h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group overflow-hidden">
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { setComboImage(file); setComboImagePreview(URL.createObjectURL(file)); }
                    }} />
                    {comboImagePreview ? (
                      <img src={comboImagePreview} className="w-full h-full object-cover" alt="Ảnh combo" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-primary transition-colors">
                        <Camera className="size-8" />
                        <span className="text-xs font-bold">Click để tải ảnh combo</span>
                      </div>
                    )}
                    {comboImagePreview && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full">Đổi ảnh</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Mô tả</label>
                  <textarea value={comboDescription} onChange={e => setComboDescription(e.target.value)}
                    placeholder="Mô tả chi tiết về combo, lợi ích sức khỏe, cách sử dụng..."
                    rows={4}
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
                </div>
              </div>
            </div>

            {/* Selected Ingredients */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="size-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                  <Sparkles className="size-5" />
                </div>
                <h3 className="text-xl font-black text-gray-900">Nguyên liệu đã chọn ({selectedIngredients.length})</h3>
              </div>

              {selectedIngredients.length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="size-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Chưa chọn nguyên liệu nào</p>
                  <p className="text-gray-400 text-sm mt-1">Chọn sản phẩm từ danh sách bên phải</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedIngredients.map((ing) => {
                    const product = availableProducts.find(p => p.id === ing.productId);
                    return (
                      <div key={ing.productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                        <img src={product?.imageUrl || `https://picsum.photos/seed/${ing.productId}/60/60`}
                          className="size-12 rounded-xl object-cover shadow-sm" />
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-800 line-clamp-1">{ing.productName}</p>
                          <p className="text-xs text-primary font-bold">
                            {((product?.sellingPrice ?? 0) * ing.quantity).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleUpdateQuantity(ing.productId, ing.quantity - 1)}
                            className="size-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 shadow-sm">
                            <Minus className="size-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-black text-gray-800">{ing.quantity}</span>
                          <button onClick={() => handleUpdateQuantity(ing.productId, ing.quantity + 1)}
                            className="size-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-600 shadow-sm">
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <button onClick={() => handleRemoveIngredient(ing.productId)}
                          className="size-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500">
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedIngredients.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Tổng giá trị đơn lẻ:</span>
                    <span className="font-black text-primary">{totalIngredientsPrice.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Giá bán combo:</span>
                    <span className="font-black text-gray-900">{(Number(comboPrice) || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {Number(comboPrice) > 0 && Number(comboPrice) <= totalIngredientsPrice && (
                    <p className="text-xs text-green-600 font-bold text-right">
                      Tiết kiệm: {(totalIngredientsPrice - Number(comboPrice)).toLocaleString('vi-VN')}đ
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Available Products */}
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
                    const isSelected = selectedIngredients.some(ing => ing.productId === product.id);
                    return (
                      <button key={product.id} onClick={() => handleAddIngredient(product.id)}
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
                {isSaving ? <><Loader2 className="size-4 animate-spin" />Đang lưu...</> : <><Save className="size-4" />{isEditMode ? 'CẬP NHẬT COMBO' : 'TẠO COMBO'}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboBuilder;
