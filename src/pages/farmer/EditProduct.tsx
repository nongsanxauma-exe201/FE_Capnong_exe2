import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Camera, Info, Truck, HelpCircle,
  AlertTriangle, Plus, Loader2, AlertCircle
} from 'lucide-react';
import { productService } from '../../services';

const EditProduct: React.FC<{ productId: number; onBack: () => void }> = ({ productId, onBack }) => {
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('kg');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  useEffect(() => {
    productService.getById(productId).then(res => {
      if (res.result) {
        const p = res.result;
        setProductName(p.productName || '');
        setPrice(p.sellingPrice || 0);
        setStock(p.stockQuantity || 0);
        setDescription(p.description || '');
        setUnit(p.unit || 'kg');
        setCategoryId(p.categoryId || 1);
        setExpiryDate(p.expiryDate || '');
        setPreview(p.imageUrl || '');
      }
    }).catch(() => setError('Không thể tải thông tin sản phẩm.')).finally(() => setLoading(false));
  }, [productId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newImages = [...images, ...selectedFiles].slice(0, 4);
      setImages(newImages);
      setPreviews(newImages.map(f => URL.createObjectURL(f)));
      if (selectedFiles[0]) {
        setImage(selectedFiles[0]);
        setPreview(URL.createObjectURL(selectedFiles[0]));
      }
    }
  };

  const handleSubmit = async () => {
    if (!productName || price <= 0 || stock <= 0) {
      setError('Vui lòng điền đầy đủ thông tin sản phẩm và giá hợp lệ.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await productService.updateProduct(productId, {
        productName,
        sellingPrice: price,
        stockQuantity: stock,
        description,
        unit,
        expiryDate: expiryDate ? expiryDate : undefined,
        categoryId: categoryId || 1
      }, image || undefined);
      onBack();
    } catch (err: any) {
      setError(err?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="size-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Chỉnh Sửa Sản Phẩm</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">ID: #{productId} — {productName}</p>
        </div>
        <div className="flex gap-4 ml-auto">
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold self-center mr-4">
              <AlertCircle className="size-4" /> {error}
            </div>
          )}
          <button onClick={onBack} className="px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all" disabled={saving}>
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-dark transform active:scale-95 transition-all disabled:bg-gray-300 flex items-center gap-2">
            {saving ? <><Loader2 className="size-4 animate-spin" />Đang lưu...</> : <><Save className="size-4" />Lưu thay đổi</>}
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
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Truck className="size-5" />
              </div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Thông số & Bảo quản</h4>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Giá bán (VNĐ/{unit})</label>
                  <div className="relative">
                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="0"
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">đ</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Số lượng tồn kho ({unit})</label>
                  <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} placeholder="0"
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-4">
                  <label className="text-sm font-bold text-gray-700">Hạn sử dụng</label>
                  <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                  <div className="p-4 bg-primary/5 rounded-2xl flex items-start gap-3 border border-primary/10">
                    <HelpCircle className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-500 font-medium">Gợi ý: Nhóm <b>Củ</b> thường có thời gian bảo quản tốt nhất trong 3 – 5 ngày ở nhiệt độ 5°C.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Rủi ro vận chuyển</label>
                  <div className="p-6 bg-red-50/50 rounded-[28px] border border-red-100 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">MỨC ĐỘ: RẤT CAO</span>
                      <AlertTriangle className="size-4 text-red-500" />
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-red-500" style={{ width: '85%' }} />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Dựa trên phân loại Củ: Dễ dập nát, héo nhanh.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Image */}
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
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                {preview ? (
                  <img src={preview} alt="Sản phẩm" className="w-full h-full object-cover" />
                ) : (
                  <div className="p-10 flex flex-col items-center">
                    <div className="size-16 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-all">
                      <Camera className="size-8 text-gray-400 group-hover:text-primary" />
                    </div>
                    <p className="text-sm font-black text-gray-800 mt-3">Kéo thả hoặc Click để tải ảnh</p>
                  </div>
                )}
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => (
                  <label key={i} className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-primary/20 cursor-pointer transition-colors relative overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    {previews.length > i ? (
                      <img src={previews[i]} alt={`Phụ ${i}`} className="w-full h-full object-cover" />
                    ) : (
                      <Plus className="size-6" />
                    )}
                  </label>
                ))}
              </div>

              <div className="p-6 bg-yellow-50/50 rounded-2xl border border-yellow-100/50">
                <h5 className="flex items-center gap-2 text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-3">
                  <AlertTriangle className="size-3" /> Quy chuẩn hình ảnh
                </h5>
                <ul className="space-y-2">
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Chụp rõ sản phẩm dưới ánh sáng tự nhiên.</li>
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Hiển thị rõ các "khuyết điểm" thẩm mỹ (nếu có).</li>
                  <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Ảnh định dạng JPG, PNG, tối đa 5MB.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;
