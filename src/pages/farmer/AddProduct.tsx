import React, { useState, useRef } from 'react';
import { ArrowLeft, Camera, Info, Truck, HelpCircle, AlertTriangle, X, Star, Tag } from 'lucide-react';
import SubmissionSuccess from './SubmissionSuccessProps';
import { productService } from '../../services';

const MAX_IMAGES = 8;

const normalizeWholeNumberInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return '';
  return digits.replace(/^0+/, '') || '0';
};

const parseWholeNumber = (value: string) => (value === '' ? 0 : Number(value));

const getTodayDateString = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const AddProduct: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('kg');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountStartDate, setDiscountStartDate] = useState('');
  const [discountEndDate, setDiscountEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [primaryIdx, setPrimaryIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    const combined = [...images, ...incoming].slice(0, MAX_IMAGES);
    setImages(combined);
    setPreviews(combined.map(f => URL.createObjectURL(f)));
    if (e.target) e.target.value = '';
  };

  const removeImage = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    setImages(newImages);
    setPreviews(newPreviews);
    if (primaryIdx === idx) setPrimaryIdx(0);
    else if (primaryIdx > idx) setPrimaryIdx(primaryIdx - 1);
  };

  const handleSubmit = async () => {
    const sellingPrice = parseWholeNumber(price);
    const stockQuantity = parseWholeNumber(stock);

    if (!productName || sellingPrice <= 0 || stockQuantity <= 0) {
      setError('Vui lòng điền đầy đủ thông tin sản phẩm và giá hợp lệ.');
      return;
    }

    if (expiryDate && expiryDate < getTodayDateString()) {
      setError('Hạn sử dụng không được chọn ngày trong quá khứ.');
      return;
    }

    const pct = discountPercent ? Number(discountPercent) : undefined;
    if (pct !== undefined && (pct < 0 || pct > 99)) {
      setError('Phần trăm giảm giá phải từ 0 đến 99.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Reorder so primary image is first
      const orderedImages = images.length > 0
        ? [images[primaryIdx], ...images.filter((_, i) => i !== primaryIdx)]
        : [];

      const response = await productService.createProduct(
        {
          productName, sellingPrice, stockQuantity, description, unit, categoryId,
          expiryDate: expiryDate || undefined,
          discountPercent: pct,
          discountStartDate: discountStartDate ? discountStartDate + ':00' : undefined,
          discountEndDate: discountEndDate ? discountEndDate + ':00' : undefined,
        },
        orderedImages.length > 0 ? orderedImages : undefined
      );

      if (response.result) setIsSubmitted(true);
    } catch (err) {
      setError('Đăng bán thất bại. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) return <SubmissionSuccess onReturn={onBack} />;

  const minExpiryDate = getTodayDateString();

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="size-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Thêm Sản Phẩm Mới</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Đăng bán sản phẩm nông sản sạch lên hệ thống.</p>
        </div>
        <div className="flex gap-4 ml-auto">
          {error && <p className="text-red-500 text-xs font-bold self-center mr-4">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-dark transform active:scale-95 transition-all disabled:bg-gray-300"
          >
            {loading ? 'Đang đăng...' : 'Đăng bán ngay'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Basic Info */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Info className="size-5" /></div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Thông tin cơ bản</h4>
            </div>
            <div className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Tên sản phẩm</label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
                  placeholder="Ví dụ: Xà lách xoăn Đà Lạt"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Danh mục</label>
                  <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none appearance-none cursor-pointer">
                    <option value={1}>Củ</option>
                    <option value={2}>Trái cây</option>
                    <option value={3}>Khác</option>
                  </select>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Đơn vị tính</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none appearance-none cursor-pointer">
                    <option value="kg">Kilogram (kg)</option>
                    <option value="túi">Túi / Bó</option>
                    <option value="thùng">Thùng</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Mô tả chi tiết</label>
                <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Mô tả đặc điểm, nguồn gốc, quy trình trồng trọt..."
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all resize-none" />
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Truck className="size-5" /></div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Thông số vận chuyển & Bảo quản</h4>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Giá bán (VNĐ/{unit})</label>
                  <div className="relative">
                    <input type="text" inputMode="numeric" value={price} onChange={e => setPrice(normalizeWholeNumberInput(e.target.value))}
                      placeholder="Nhập giá"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">đ</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Số lượng tồn kho ({unit})</label>
                  <input type="text" inputMode="numeric" value={stock} onChange={e => setStock(normalizeWholeNumberInput(e.target.value))}
                    placeholder="Nhập số lượng"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
              </div>
              {/* Banner phí nền tảng 10% */}
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                <div className="size-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="size-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-blue-800 mb-1">💡 Phí nền tảng 10%</p>
                  <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                    Hệ thống thu <span className="font-black">10%</span> trên doanh thu thuần (tiền hàng,
                    không tính phí ship) của mỗi đơn thành công. Hãy cộng thêm khoảng{' '}
                    <span className="font-black">10–15%</span> vào giá bán để đảm bảo lợi nhuận.
                  </p>
                  {parseWholeNumber(price) > 0 && (
                    <p className="text-[10px] font-bold text-blue-600 mt-1.5">
                      Ví dụ với giá {parseWholeNumber(price).toLocaleString('vi-VN')}đ →
                      phí sàn ~{Math.round(parseWholeNumber(price) * 0.1).toLocaleString('vi-VN')}đ →
                      bạn nhận ~{Math.round(parseWholeNumber(price) * 0.9).toLocaleString('vi-VN')}đ/{unit}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-sm font-bold text-gray-700">Hạn sử dụng</label>
                <input type="date" value={expiryDate} min={minExpiryDate}
                  onChange={e => { if (!e.target.value || e.target.value >= minExpiryDate) setExpiryDate(e.target.value); }}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none" />
                <div className="p-4 bg-primary/5 rounded-2xl flex items-start gap-3 border border-primary/10">
                  <HelpCircle className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-500 font-medium">Gợi ý: Nhóm <b>Củ</b> thường có thời gian bảo quản tốt nhất trong 3 – 5 ngày ở nhiệt độ 5°C.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Discount Section */}
          <div className="bg-white rounded-[32px] border border-orange-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500"><Tag className="size-5" /></div>
              <div>
                <h4 className="font-black text-gray-800 uppercase tracking-tight">Thiết lập giảm giá</h4>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Tùy chọn — để trống nếu không giảm giá</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Phần trăm giảm giá (%)</label>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric"
                    value={discountPercent}
                    onChange={e => setDiscountPercent(normalizeWholeNumberInput(e.target.value))}
                    placeholder="VD: 20 (giảm 20%)"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-orange-400/20 focus:bg-white transition-all"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-orange-400">%</span>
                </div>
                {discountPercent && price && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <span className="text-xs text-gray-500 line-through">{parseWholeNumber(price).toLocaleString('vi-VN')}đ</span>
                    <span className="text-sm font-black text-orange-600">
                      {Math.round(parseWholeNumber(price) * (1 - Number(discountPercent) / 100)).toLocaleString('vi-VN')}đ
                    </span>
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">-{discountPercent}%</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Bắt đầu giảm giá</label>
                  <input
                    type="datetime-local"
                    value={discountStartDate}
                    onChange={e => setDiscountStartDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium text-gray-600 outline-none"
                  />
                  <p className="text-[10px] text-gray-400">Để trống = giảm giá ngay khi duyệt</p>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Kết thúc giảm giá</label>
                  <input
                    type="datetime-local"
                    value={discountEndDate}
                    onChange={e => setDiscountEndDate(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium text-gray-600 outline-none"
                  />
                  <p className="text-[10px] text-gray-400">Để trống = không hết hạn</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar — Image Uploader */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Camera className="size-5" /></div>
              <div>
                <h4 className="font-black text-gray-800 uppercase tracking-tight">Hình ảnh</h4>
                <p className="text-[10px] text-gray-400 font-medium">{images.length}/{MAX_IMAGES} ảnh</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Upload zone */}
              {images.length < MAX_IMAGES && (
                <label className="block w-full border-2 border-dashed border-gray-200 rounded-[24px] py-8 flex flex-col items-center gap-3 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                  <div className="size-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <Camera className="size-6 text-gray-400 group-hover:text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-gray-700">Kéo thả hoặc click để tải ảnh</p>
                    <p className="text-[10px] text-gray-400 mt-1">JPG, PNG — tối đa {MAX_IMAGES} ảnh</p>
                  </div>
                </label>
              )}

              {/* Preview grid */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={src} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />

                      {/* Primary badge */}
                      {idx === primaryIdx && (
                        <div className="absolute bottom-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star className="size-2.5 fill-white" /> Chính
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {idx !== primaryIdx && (
                          <button onClick={() => setPrimaryIdx(idx)}
                            title="Đặt làm ảnh chính"
                            className="size-7 bg-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-300 transition-colors">
                            <Star className="size-3.5 text-white fill-white" />
                          </button>
                        )}
                        <button onClick={() => removeImage(idx)}
                          className="size-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition-colors">
                          <X className="size-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-5 bg-yellow-50/50 rounded-2xl border border-yellow-100/50">
                <h5 className="flex items-center gap-2 text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-2">
                  <AlertTriangle className="size-3" /> Quy chuẩn hình ảnh
                </h5>
                <ul className="space-y-1.5">
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Chụp rõ dưới ánh sáng tự nhiên.</li>
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Ảnh <b>★ Chính</b> hiện trên trang listing.</li>
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Hover ảnh → click ★ để đổi ảnh chính.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
