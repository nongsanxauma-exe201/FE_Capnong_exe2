import React, { useState, useEffect } from 'react';
import { Check, X, Eye, ArrowLeft, AlertCircle, Loader2, RefreshCw, Package, Star } from 'lucide-react';
import { productService, ProductResponse, ProductImageResponse } from '../../services';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const ProductApproval: React.FC = () => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingProductId, setRejectingProductId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [galleryImages, setGalleryImages] = useState<ProductImageResponse[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await productService.getPendingProducts();
      if (response.result) setProducts(response.result);
    } catch (err) {
      console.error('Failed to fetch pending products', err);
      setError('Mất kết nối tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Load gallery khi admin mở xem chi tiết sản phẩm
  useEffect(() => {
    if (!selectedProduct) { setGalleryImages([]); setPreviewIdx(0); return; }
    setGalleryLoading(true);
    productService.getImages(selectedProduct.id)
      .then(res => {
        const imgs = (res.result ?? []).slice().sort((a, b) => {
          if (a.isPrimary) return -1;
          if (b.isPrimary) return 1;
          return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
        });
        setGalleryImages(imgs);
        setPreviewIdx(0);
      })
      .catch(() => setGalleryImages([]))
      .finally(() => setGalleryLoading(false));
  }, [selectedProduct?.id]);

  const handleApprove = async (product: ProductResponse) => {
    if (!await globalShowConfirm(`Duyệt sản phẩm "${product.productName}"?`)) return;
    try {
      setIsProcessing(true);
      await productService.approveProduct(product.id);
      globalShowAlert(`Đã duyệt sản phẩm "${product.productName}"`, 'Thành công', 'success');
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Có lỗi khi duyệt sản phẩm', 'Lỗi', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      globalShowAlert('Vui lòng nhập lý do từ chối', 'Lỗi', 'error');
      return;
    }
    if (!rejectingProductId) return;
    try {
      setIsProcessing(true);
      await productService.rejectProduct(rejectingProductId, rejectReason);
      globalShowAlert(`Đã từ chối sản phẩm #${rejectingProductId}`, 'Thành công', 'success');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingProductId(null);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Có lỗi khi từ chối sản phẩm', 'Lỗi', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = products.filter(p =>
    p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery)
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải danh sách chờ duyệt...</p>
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedProduct(null)}
            className="size-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-3xl font-black font-display text-gray-900">Chi Tiết Sản Phẩm</h2>
            <p className="text-gray-400 font-medium text-sm mt-1">Duyệt hoặc từ chối sản phẩm này</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              {/* Gallery preview */}
              {galleryLoading ? (
                <div className="w-full h-64 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-6">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
              ) : galleryImages.length > 0 ? (
                <div className="mb-6">
                  {/* Main preview */}
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 mb-3">
                    <img
                      src={galleryImages[previewIdx]?.imageUrl}
                      alt={selectedProduct.productName}
                      className="w-full h-full object-cover"
                    />
                    {galleryImages[previewIdx]?.isPrimary && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-full">
                        <Star className="size-3 fill-white" /> Ảnh chính
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      {previewIdx + 1}/{galleryImages.length}
                    </div>
                  </div>
                  {/* Thumbnail strip */}
                  {galleryImages.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {galleryImages.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setPreviewIdx(idx)}
                          className={`relative size-14 rounded-xl overflow-hidden border-2 transition-all ${
                            idx === previewIdx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                          {img.isPrimary && (
                            <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                              <Star className="size-3 text-primary fill-primary drop-shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={selectedProduct.imageUrl || 'https://picsum.photos/seed/product/400/400'}
                  alt={selectedProduct.productName}
                  className="w-full h-64 rounded-2xl object-cover mb-6 border border-gray-100 bg-gray-50"
                />
              )}
              <div className="space-y-3">
                <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                  <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">TRẠNG THÁI</p>
                  <p className="text-sm font-black text-yellow-700">Chờ duyệt</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">ID SẢN PHẨM</p>
                  <p className="text-sm font-bold text-gray-900">#{selectedProduct.id}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">SHOP</p>
                  <p className="text-sm font-bold text-gray-900">
                    {selectedProduct.shopName || `#${selectedProduct.shopOwnerId || selectedProduct.shopId || '?'}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <h3 className="text-xl font-black text-gray-900 mb-6">Thông Tin Sản Phẩm</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Tên sản phẩm</label>
                  <p className="text-lg font-black text-gray-900">{selectedProduct.productName}</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Giá bán</label>
                    <p className="text-lg font-black text-primary">{(selectedProduct.sellingPrice || 0).toLocaleString('vi-VN')}đ / {selectedProduct.unit}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Tồn kho</label>
                    <p className="text-lg font-black text-gray-900">{selectedProduct.stockQuantity}</p>
                  </div>
                </div>
                {selectedProduct.expiryDate && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Hạn sử dụng</label>
                    <p className="text-sm font-bold text-gray-900">{selectedProduct.expiryDate}</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Mô tả</label>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedProduct.description || '—'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
              <h3 className="text-lg font-black text-gray-900 mb-4">Quyết Định</h3>
              <div className="flex gap-4">
                <button
                  disabled={isProcessing}
                  onClick={() => handleApprove(selectedProduct)}
                  className="flex-1 px-6 py-4 bg-emerald-50 text-emerald-600 text-sm font-black rounded-2xl uppercase tracking-widest hover:bg-emerald-100 transition-colors flex items-center justify-center gap-3 border border-emerald-200 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                  Duyệt Sản Phẩm
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => { setRejectingProductId(selectedProduct.id); setShowRejectModal(true); }}
                  className="flex-1 px-6 py-4 bg-red-50 text-red-600 text-sm font-black rounded-2xl uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-3 border border-red-200 disabled:opacity-50"
                >
                  <X className="size-5" /> Từ Chối
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Lý Do Từ Chối</h3>
            <p className="text-sm text-gray-400 mb-6">Nông dân sẽ nhận được thông báo kèm lý do này.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Ảnh sản phẩm không rõ ràng, thiếu thông tin..."
              className="w-full px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all resize-none mb-6"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                disabled={isProcessing}
                onClick={() => { setShowRejectModal(false); setRejectReason(''); setRejectingProductId(null); }}
                className="flex-1 py-4 bg-gray-50 text-gray-600 text-sm font-black rounded-2xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                disabled={isProcessing || !rejectReason.trim()}
                onClick={confirmReject}
                className="flex-[2] py-4 bg-red-600 text-white text-sm font-black rounded-2xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black font-display text-gray-900">Duyệt Sản Phẩm</h2>
            <p className="text-gray-400 font-medium text-sm mt-1">Các sản phẩm nông dân đăng lên đang chờ phê duyệt.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-50 border border-yellow-100 px-5 py-3 rounded-2xl flex items-center gap-3">
              <Package className="size-5 text-yellow-600" />
              <div>
                <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Chờ duyệt</p>
                <p className="text-xl font-black text-gray-900">{products.length}</p>
              </div>
            </div>
            <button
              onClick={fetchProducts}
              className="size-12 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
            >
              <RefreshCw className="size-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600 font-bold">
            <AlertCircle className="size-6" /> {error}
          </div>
        )}

        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm hoặc ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm px-5 py-3 bg-gray-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sản phẩm</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Shop</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Giá / Tồn kho</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hạn SD</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <Package className="size-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-400 font-bold text-sm">Không có sản phẩm nào đang chờ duyệt.</p>
                    </td>
                  </tr>
                ) : filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img
                          src={product.imageUrl || 'https://picsum.photos/seed/product/80/80'}
                          className="size-12 rounded-xl object-cover border border-gray-100 bg-gray-50"
                          alt={product.productName}
                        />
                        <div>
                          <p className="text-sm font-black text-gray-900 line-clamp-1 max-w-[200px]">{product.productName}</p>
                          <p className="text-[10px] text-gray-400 font-bold">ID: {product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-gray-700">
                        {product.shopName || `Shop #${product.shopOwnerId || product.shopId || '?'}`}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <p className="text-sm font-black text-primary">{(product.sellingPrice || 0).toLocaleString('vi-VN')}đ</p>
                      <p className="text-[10px] text-gray-400">{product.stockQuantity} {product.unit}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-gray-600">{product.expiryDate || '—'}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="px-3 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl uppercase hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="size-3.5" /> Xem
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleApprove(product)}
                          className="px-3 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl uppercase hover:bg-emerald-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="size-3.5" /> Duyệt
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => { setRejectingProductId(product.id); setShowRejectModal(true); }}
                          className="px-3 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl uppercase hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <X className="size-3.5" /> Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductApproval;
