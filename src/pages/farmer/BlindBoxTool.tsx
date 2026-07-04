
import React, { useEffect, useState } from 'react';
import { Sparkles, Info, ArrowRight, Package, Box, Zap, Gift, Trash2, Sprout, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { mysteryBoxService, MysteryBox, MysteryBoxCreationRequest, ProductMysteryRequest, authService, productService, ProductResponse } from '../../services';
import { ImagePlus } from 'lucide-react';

const BlindBoxTool: React.FC = () => {
  const [price, setPrice] = useState(59000);
  const [runningBoxes, setRunningBoxes] = useState<MysteryBox[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [boxImage, setBoxImage] = useState<File | null>(null);
  const [boxImagePreview, setBoxImagePreview] = useState<string | null>(null);
  const [realItems, setRealItems] = useState<ProductResponse[]>([]);
  const [boxType, setBoxType] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [totalQuantity, setTotalQuantity] = useState(10);
  // productId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});

  const fetchMyBoxes = async () => {
    setLoadingBoxes(true);
    setError(null);
    try {
      const response = await mysteryBoxService.getMyBoxes();
      setRunningBoxes(response.result || []);
    } catch (err) {
      console.error('Failed to load mystery boxes', err);
      setError('Không thể tải danh sách túi mù. Vui lòng đảm bảo bạn đã đăng nhập với vai trò nhà vườn.');
    } finally {
      setLoadingBoxes(false);
    }
  };

  const fetchRealProducts = async () => {
    setLoadingProducts(true);
    try {
      const user = await authService.getMyInfo();
      if (user.result) {
        const products = await productService.getByShopId(user.result.id);
        if (products.result) {
          setRealItems(products.result);
        }
      }
    } catch (err) {
      console.error('Failed to fetch real products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchMyBoxes();
    fetchRealProducts();
  }, []);

  const handleCreateBox = async () => {
    if (Object.keys(selectedItems).length === 0) {
      setError('Vui lòng chọn ít nhất một sản phẩm để tạo túi mù.');
      return;
    }
    if (!boxType.trim()) {
      setError('Vui lòng nhập tên túi mù.');
      return;
    }
    const totalProductsPrice = Object.entries(selectedItems).reduce((sum, [id, qty]) => {
      const product = realItems.find(p => p.id === Number(id));
      return sum + (Number(product?.sellingPrice) || 0) * qty;
    }, 0);
    if (totalProductsPrice > 0 && price > totalProductsPrice) {
      setError(`Giá bán (${price.toLocaleString('vi-VN')}đ) không được lớn hơn tổng giá trị sản phẩm (${totalProductsPrice.toLocaleString('vi-VN')}đ). Túi mù nên rẻ hơn hoặc bằng giá lẻ.`);
      return;
    }
    setCreating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const products: ProductMysteryRequest[] = Object.entries(selectedItems).map(([id, qty]) => ({
        productId: Number(id),
        quantity: qty,
      }));
      const data: MysteryBoxCreationRequest = {
        boxType: boxType,
        price: price,
        description: description.trim() || undefined,
        note: note.trim() || undefined,
        totalQuantity,
        products,
      };
      await mysteryBoxService.createMysteryBox(data, boxImage || undefined);
      setSuccessMsg('Đã tạo túi mù thành công!');
      setBoxImage(null);
      setBoxImagePreview(null);
      setSelectedItems({});
      setBoxType('');
      setDescription('');
      setNote('');
      setTotalQuantity(10);
      await fetchMyBoxes();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to create mystery box', err);
      setError(err?.data?.message || 'Không thể tạo túi mù. Vui lòng thử lại.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBox = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      await mysteryBoxService.deleteMysteryBox(id);
      setRunningBoxes(prev => prev.filter(box => box.id !== id));
    } catch (err: any) {
      console.error('Failed to delete mystery box', err);
      setError('Không thể xóa túi mù. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleItemSelection = (id: number) => {
    setSelectedItems(prev => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  };

  const setItemQuantity = (id: number, qty: number) => {
    if (qty < 1) return;
    setSelectedItems(prev => ({ ...prev, [id]: qty }));
  };

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Blind Box Surplus Tool</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Giải cứu nông sản dư thừa bằng cách tạo các túi quà bí ẩn hấp dẫn.</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
          <Zap className="size-4 fill-primary" />
          <span className="text-xs font-black uppercase tracking-widest">Tiết kiệm rác thải: 42kg tháng này</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Box className="size-5" />
              </div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Bước 1: Chọn nông sản dư thừa</h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {loadingProducts ? (
                <div className="col-span-full py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Đang tải sản phẩm của bạn...</div>
              ) : realItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 group cursor-pointer" onClick={() => toggleItemSelection(item.id)}>
                  <div className={`relative aspect-square rounded-[32px] overflow-hidden border-2 transition-all shadow-sm ${selectedItems[item.id] !== undefined ? 'border-primary' : 'border-transparent group-hover:border-primary'}`}>
                    <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className={`absolute inset-0 transition-all ${selectedItems[item.id] !== undefined ? 'bg-primary/10' : 'bg-black/10 group-hover:bg-transparent'}`} />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur size-6 rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                      <input type="checkbox" className="size-3 accent-primary" checked={selectedItems[item.id] !== undefined} onChange={() => { }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-gray-800 uppercase truncate px-2">{item.productName}</p>
                    <p className="text-[10px] text-primary font-bold">Tồn: {(item.stockKg ?? item.stockQuantity).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg</p>
                    {selectedItems[item.id] !== undefined && (
                      <div className="flex items-center justify-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setItemQuantity(item.id, (selectedItems[item.id] || 1) - 1)} className="size-5 rounded-full bg-gray-100 hover:bg-primary/10 text-gray-600 flex items-center justify-center text-xs font-black">-</button>
                        <span className="text-xs font-black text-gray-800 w-6 text-center">{selectedItems[item.id]}</span>
                        <button onClick={() => setItemQuantity(item.id, (selectedItems[item.id] || 1) + 1)} className="size-5 rounded-full bg-gray-100 hover:bg-primary/10 text-gray-600 flex items-center justify-center text-xs font-black">+</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {!loadingProducts && realItems.length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  Bạn chưa đăng sản phẩm nào. Hãy đăng sản phẩm để tạo túi mù!
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Sparkles className="size-5" />
              </div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Bước 2: Thiết lập combo</h4>
            </div>

            <div className="space-y-12">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Mức giá túi mù (VND)</label>
                  <span className="text-3xl font-black text-primary">{price.toLocaleString('vi-VN')}đ</span>
                </div>
                <input
                  type="range"
                  min="29000"
                  max="199000"
                  step="1000"
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-full appearance-none accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                  <span>29.000đ</span>
                  <span>199.000đ</span>
                </div>
                {Object.keys(selectedItems).length > 0 && (() => {
                  const total = Object.entries(selectedItems).reduce((sum, [id, qty]) => {
                    const product = realItems.find(p => p.id === Number(id));
                    return sum + (Number(product?.sellingPrice) || 0) * qty;
                  }, 0);
                  return total > 0 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-500">Tổng giá trị sản phẩm:</span>
                        <span className="text-primary">{total.toLocaleString('vi-VN')}đ</span>
                      </div>
                      {price > total && (
                        <p className="text-xs text-red-500 font-bold">⚠ Giá bán không được vượt quá tổng giá trị sản phẩm</p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên túi mù *</label>
                  <input
                    type="text"
                    value={boxType}
                    onChange={(e) => setBoxType(e.target.value)}
                    placeholder="VD: Củ quả tươi mùa hè"
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-[24px] text-sm font-black outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Số lượng túi bán ra *</label>
                  <input
                    type="number"
                    min="1"
                    value={totalQuantity}
                    onChange={(e) => setTotalQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-[24px] text-sm font-black outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Hình ảnh túi mù</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBoxImage(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setBoxImagePreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="box-image-upload"
                    />
                    <label htmlFor="box-image-upload" className="w-full p-4 bg-gray-50 border border-dashed border-gray-200 rounded-[24px] flex items-center gap-3 cursor-pointer hover:bg-white hover:border-primary/30 transition-all">
                      <ImagePlus className="size-5 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500 truncate">{boxImage ? boxImage.name : 'Tải lên ảnh bìa túi mù...'}</span>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Mô tả</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả về túi mù này..."
                    rows={3}
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-[24px] text-sm font-medium outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all resize-none"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:col-span-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Ghi chú</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú thêm (không bắt buộc)..."
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-[24px] text-sm font-medium outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 flex flex-col gap-8">
            <div className="size-20 bg-primary/5 rounded-[32px] flex items-center justify-center mx-auto text-primary overflow-hidden border border-primary/10">
              {boxImagePreview ? (
                <img src={boxImagePreview} className="w-full h-full object-cover" />
              ) : (
                <Gift className="size-10" />
              )}
            </div>
            <div className="text-center">
              <h4 className="text-xl font-black text-gray-900 mb-2">Xem trước túi mù</h4>
              <p className="text-[11px] text-gray-400 font-medium">Khách hàng sẽ thấy túi này như một hộp quà bất ngờ.</p>
            </div>

            <div className="p-6 bg-gray-50/50 rounded-[32px] border border-gray-100 flex flex-col gap-4">
              <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>Cửa hàng:</span>
                <span className="text-gray-900">Nông Trại Xanh</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-gray-900">
                <span>Giá niêm yết:</span>
                <span className="text-primary">{price.toLocaleString('vi-VN')}đ</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 italic">
                <span>Số lượng:</span>
                <span>{totalQuantity} túi</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 italic">
                <span>Gồm:</span>
                <span>{boxType || '—'}</span>
              </div>
              {Object.keys(selectedItems).length > 0 && (
                <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 italic">
                  <span>Đã chọn:</span>
                  <span className="truncate ml-4 max-w-[120px]">
                    {Object.entries(selectedItems).map(([id, qty]) => `${realItems.find(i => i.id === Number(id))?.productName} x${qty}`).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 flex items-start gap-3">
              <Info className="size-4 text-primary shrink-0 mt-1" />
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                Shop chọn thủ công các sản phẩm và số lượng cho từng túi mù. Khách hàng sẽ không biết nội dung bên trong cho đến khi nhận hàng.
              </p>
            </div>

            {successMsg && (
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-3">
                <CheckCircle2 className="size-4 text-green-500" />
                <p className="text-[11px] text-green-700 font-medium">{successMsg}</p>
              </div>
            )}

            <button onClick={handleCreateBox} disabled={creating} className="w-full py-5 bg-primary text-white font-black rounded-[32px] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              <Gift className="size-5" /> {creating ? 'ĐANG TẠO...' : 'TẠO TÚI MÙ'}
            </button>
          </div>

          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 flex flex-col gap-6">
            <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">
              Túi đang chạy ({runningBoxes.length})
            </h5>

            {loadingBoxes && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Clock className="size-4 text-primary" />
                <p className="text-[11px] text-gray-600 font-medium">Đang tải danh sách túi mù...</p>
              </div>
            )}

            {error && !loadingBoxes && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3">
                <AlertCircle className="size-4 text-red-500" />
                <p className="text-[11px] text-red-700 font-medium">{error}</p>
              </div>
            )}

            {!loadingBoxes && !error && (
              <div className="space-y-4">
                {runningBoxes.map((box) => (
                  <div
                    key={box.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group"
                  >
                    <div className="flex items-center gap-3">
                      <Sprout className="size-5 text-primary" />
                      <div>
                        <p className="text-xs font-black text-gray-800 uppercase">
                          {box.boxType || `Túi mù #${box.id}`}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold">
                          Giá: {box.price?.toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteBox(box.id)} disabled={deletingId === box.id} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                      {deletingId === box.id ? <Clock className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </button>
                  </div>
                ))}

                {!runningBoxes.length && (
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] text-center">
                    Bạn chưa có túi mù nào đang chạy
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlindBoxTool;