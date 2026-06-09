import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Camera, Info, Truck, HelpCircle,
  AlertTriangle, Loader2, AlertCircle, X, Star, Plus
} from 'lucide-react';
import { productService, ProductImageResponse } from '../../services';

const MAX_IMAGES = 8;

const EditProduct: React.FC<{ productId: number; onBack: () => void }> = ({ productId, onBack }) => {
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('kg');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<ProductImageResponse[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      productService.getById(productId),
      productService.getImages(productId),
    ]).then(([productRes, imagesRes]) => {
      if (productRes.result) {
        const p = productRes.result;
        setProductName(p.productName || '');
        setPrice(p.sellingPrice || 0);
        setStock(p.stockQuantity || 0);
        setDescription(p.description || '');
        setUnit(p.unit || 'kg');
        setCategoryId(p.categoryId || 1);
        setExpiryDate(p.expiryDate || '');
      }
      if (imagesRes.result) setGalleryImages(imagesRes.result);
    }).catch(() => setError('Không thể tải thông tin sản phẩm.')).finally(() => setLoading(false));
  }, [productId]);

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    if (galleryImages.length + files.length > MAX_IMAGES) {
      setError(`Tối đa ${MAX_IMAGES} ảnh. Hiện có ${galleryImages.length} ảnh.`);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await productService.addImages(productId, files);
      if (res.result) setGalleryImages(res.result);
    } catch {
      setError('Upload ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (galleryImages.length <= 1) {
      setError('Sản phẩm phải có ít nhất 1 ảnh.');
      return;
    }
    const img = galleryImages.find(i => i.id === imageId);
    if (img?.isPrimary) {
      setError('Không thể xóa ảnh chính. Hãy chọn ảnh khác làm ảnh chính trước.');
      return;
    }
    try {
      await productService.deleteImage(productId, imageId);
      setGalleryImages(prev => prev.filter(i => i.id !== imageId));
    } catch {
      setError('Xóa ảnh thất bại.');
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      const res = await productService.setPrimaryImage(productId, imageId);
      if (res.result) {
        setGalleryImages(prev =>
          prev.map(img => ({ ...img, isPrimary: img.id === imageId }))
        );
      }
    } catch {
      setError('Không thể đổi ảnh chính.');
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
        productName, sellingPrice: price, stockQuantity: stock,
        description, unit, expiryDate: expiryDate || undefined, categoryId: categoryId || 1
      });
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

  const sortedImages = [...galleryImages].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return a.displayOrder - b.displayOrder;
  });

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
          {error && <div className="flex items-center gap-2 text-red-500 text-xs font-bold self-center mr-4"><AlertCircle className="size-4" /> {error}</div>}
          <button onClick={onBack} className="px-6 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 shadow-sm transition-all" disabled={saving}>Hủy</button>
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
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Info className="size-5" /></div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Thông tin cơ bản</h4>
            </div>
            <div className="space-y-8">
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-gray-700">Tên sản phẩm</label>
                <input type="text" value={productName} onChange={e => setProductName(e.target.value)}
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
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all resize-none" />
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Truck className="size-5" /></div>
              <h4 className="font-black text-gray-800 uppercase tracking-tight">Thông số & Bảo quản</h4>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Giá bán (VNĐ/{unit})</label>
                  <div className="relative">
                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-400">đ</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-gray-700">Số lượng tồn kho ({unit})</label>
                  <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))}
                    className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <label className="text-sm font-bold text-gray-700">Hạn sử dụng</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold text-gray-600 outline-none focus:ring-2 focus:ring-primary/10 transition-all" />
                <div className="p-4 bg-primary/5 rounded-2xl flex items-start gap-3 border border-primary/10">
                  <HelpCircle className="size-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-500 font-medium">Gợi ý: Nhóm <b>Củ</b> thường có thời gian bảo quản tốt nhất trong 3 – 5 ngày ở nhiệt độ 5°C.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar — Gallery Manager */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Camera className="size-5" /></div>
                <div>
                  <h4 className="font-black text-gray-800 uppercase tracking-tight">Hình ảnh</h4>
                  <p className="text-[10px] text-gray-400 font-medium">{galleryImages.length}/{MAX_IMAGES} ảnh</p>
                </div>
              </div>
              {galleryImages.length < MAX_IMAGES && (
                <label className="cursor-pointer size-9 bg-primary/10 rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
                  {uploading ? <Loader2 className="size-4 text-primary animate-spin" /> : <Plus className="size-4 text-primary" />}
                </label>
              )}
            </div>

            {/* Current images grid */}
            {sortedImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {sortedImages.map(img => (
                  <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={img.imageUrl} className="w-full h-full object-cover" alt="Gallery" />

                    {img.isPrimary && (
                      <div className="absolute bottom-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="size-2.5 fill-white" /> Chính
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {!img.isPrimary && (
                        <button onClick={() => handleSetPrimary(img.id)}
                          title="Đặt làm ảnh chính"
                          className="size-7 bg-yellow-400 rounded-full flex items-center justify-center hover:bg-yellow-300 transition-colors">
                          <Star className="size-3.5 text-white fill-white" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteImage(img.id)}
                        className="size-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition-colors">
                        <X className="size-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add more slot */}
                {galleryImages.length < MAX_IMAGES && (
                  <label className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                    <input type="file" accept="image/*" multiple onChange={handleAddImages} className="hidden" />
                    <Plus className="size-5 text-gray-400" />
                  </label>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-[24px] py-10 flex flex-col items-center gap-3 mb-4">
                <Camera className="size-8 text-gray-300" />
                <p className="text-xs font-bold text-gray-400">Chưa có ảnh nào</p>
              </div>
            )}

            <div className="p-5 bg-yellow-50/50 rounded-2xl border border-yellow-100/50">
              <h5 className="flex items-center gap-2 text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-2">
                <AlertTriangle className="size-3" /> Hướng dẫn
              </h5>
              <ul className="space-y-1.5">
                <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Hover ảnh → click <b>★</b> để đổi ảnh chính.</li>
                <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Hover ảnh → click <b>✕</b> để xóa ảnh.</li>
                <li className="flex gap-2 text-[11px] text-gray-500 font-medium"><span className="text-yellow-600">•</span>Không thể xóa ảnh chính khi còn 1 ảnh.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;
