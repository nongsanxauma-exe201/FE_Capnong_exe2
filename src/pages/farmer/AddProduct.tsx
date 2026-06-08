import React, { useState } from 'react';
import { ArrowLeft, Save, Send, Camera, Info, Truck, HelpCircle, AlertTriangle } from 'lucide-react';
import SubmissionSuccess from './SubmissionSuccessProps';
import { productService } from '../../services';

/** Bỏ số 0 đầu (02123 → 2123), cho phép xóa trắng khi đang gõ */
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setImages([selectedFile]);
      setPreviews([URL.createObjectURL(selectedFile)]);
    }
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

    setLoading(true);
    setError(null);
    try {
      const response = await productService.createProduct({
        productName,
        sellingPrice,
        stockQuantity,
        description,
        unit,
        categoryId,
        expiryDate: expiryDate ? expiryDate : undefined,
      }, images.length > 0 ? images[0] : undefined);

      if (response.result) {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error('Failed to create product', err);
      setError('Đăng bán thất bại. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return <SubmissionSuccess onReturn={onBack} />;
  }

  const minExpiryDate = getTodayDateString();

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="size-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Thêm Sản Phẩm Mới</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Đăng bán sản phẩm nông sản sạch lên hệ thống XẤU MÃ.</p>
        </div>
        <div className="flex gap-4 ml-auto">
          {error && <p className="text-red-500 text-xs font-bold self-center mr-4">{error}</p>}
          <button className="px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all" disabled={loading}>Lưu bản nháp</button>
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
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Info className="size-5" />
              </div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Thông tin cơ bản</h4>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Tên sản phẩm</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ví dụ: Xà lách xoăn Đà Lạt"
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Mã SKU</label>
                  <input type="text" placeholder="SKU-AUTO-7231" disabled className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium text-gray-400 italic" />
                  <p className="text-[10px] text-gray-400 font-medium">Mã sản phẩm được tạo tự động.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Danh mục</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none appearance-none cursor-pointer"
                  >
                    <option value={1}>Củ</option>
                    <option value={2}>Trái cây</option>
                    <option value={3}>Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Đơn vị tính</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none appearance-none cursor-pointer"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="túi">Túi / Bó</option>
                    <option value="thùng">Thùng</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Mô tả chi tiết</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả đặc điểm, nguồn gốc, quy trình trồng trọt..."
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Logistics Info */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Truck className="size-5" />
              </div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Thông số vận chuyển & Bảo quản</h4>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Giá bán (VNĐ/{unit})</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={price}
                      onChange={(e) => setPrice(normalizeWholeNumberInput(e.target.value))}
                      placeholder="Nhập giá"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">đ</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Số lượng tồn kho ({unit})</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stock}
                    onChange={(e) => setStock(normalizeWholeNumberInput(e.target.value))}
                    placeholder="Nhập số lượng"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-bold text-gray-700">Hạn sử dụng</label>
                  <input
                    type="date"
                    value={expiryDate}
                    min={minExpiryDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value && value < minExpiryDate) return;
                      setExpiryDate(value);
                    }}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none"
                  />
                  <div className="p-4 bg-primary/5 rounded-2xl flex items-start gap-3 border border-primary/10">
                    <HelpCircle className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-500 font-medium">Gợi ý: Nhóm <b>Củ</b> thường có thời gian bảo quản tốt nhất trong 3 – 5 ngày ở nhiệt độ 5°C.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Rủi ro vận chuyển</label>
                  <div className="p-6 bg-red-50/50 rounded-[28px] border border-red-100 flex flex-col gap-3 relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">MỨC ĐỘ: RẤT CAO</span>
                      <AlertTriangle className="size-4 text-red-500" />
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full relative z-10">
                      <div className="h-full bg-red-500" style={{ width: '85%' }} />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed relative z-10">
                      Dựa trên phân loại Củ: Dễ dập nát, héo nhanh.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Camera className="size-5" />
              </div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Hình ảnh sản phẩm</h4>
            </div>

            <div className="space-y-6">
              <label className="aspect-square w-full border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center text-center gap-4 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all group relative overflow-hidden">
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                
                {previews.length > 0 ? (
                  <img src={previews[0]} alt="Sản phẩm chính" className="w-full h-full object-cover" />
                ) : (
                  <div className="p-10 flex flex-col items-center">
                    <div className="size-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-all transform group-hover:-translate-y-1">
                      <span className="material-symbols-outlined text-gray-400 text-3xl group-hover:text-primary">upload</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-800">Kéo thả hoặc Click để tải ảnh</p>
                      <p className="text-[10px] text-gray-400 font-medium mt-1 px-4 leading-relaxed">Khuyến khích ảnh thật, không qua chỉnh sửa để tăng độ tin cậy.</p>
                    </div>
                  </div>
                )}
              </label>

              <div className="p-6 bg-yellow-50/50 rounded-2xl border border-yellow-100/50">
                <h5 className="flex items-center gap-2 text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3">
                  <AlertTriangle className="size-3" /> Quy chuẩn hình ảnh
                </h5>
                <ul className="space-y-2">
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium">
                    <span className="text-yellow-600">•</span>
                    Chụp rõ sản phẩm dưới ánh sáng tự nhiên.
                  </li>
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium">
                    <span className="text-yellow-600">•</span>
                    Hiển thị rõ các "khuyết điểm" thẩm mỹ (nếu có).
                  </li>
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium">
                    <span className="text-yellow-600">•</span>
                    Ảnh định dạng JPG, PNG, tối đa 5MB.
                  </li>
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
