import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit3, CheckCircle, Clock, AlertCircle, Loader2, Sparkles, Tag, X, CalendarDays, Check, ChevronDown } from 'lucide-react';
import { productService, mysteryBoxService, authService, ProductResponse, MysteryBox } from '../../services';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const PAGE_SIZE = 10;

const Products: React.FC<{ onNavigate: (id: string) => void }> = ({ onNavigate }) => {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [mysteryBoxes, setMysteryBoxes] = useState<MysteryBox[]>([]);
  const [activeTab, setActiveTab] = useState<'NONG_SAN' | 'BLIND_BOX'>('NONG_SAN');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [togglingProduct, setTogglingProduct] = useState<number | null>(null);
  const [togglingBox, setTogglingBox] = useState<number | null>(null);

  // Bulk discount state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkPct, setBulkPct] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);
  const [showDateOptions, setShowDateOptions] = useState(false);

  const [page, setPage] = useState(0);
  const [shopId, setShopId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const userRes = await authService.getMyInfo();
      const id = userRes.result?.id;
      if (id) {
        setShopId(Number(id));
        const [productsRes, mysteryRes] = await Promise.all([
          productService.getByShopId(Number(id)).catch(() => ({ result: [] })),
          mysteryBoxService.getMyBoxes().catch(() => ({ result: [] }))
        ]);
        if (productsRes.result) {
          setProducts(productsRes.result);
        }
        if (mysteryRes.result) setMysteryBoxes(mysteryRes.result);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Mất kết nối tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Only fetch once initially or when forced

  const handleToggleProductActive = async (product: ProductResponse) => {
    const isAvailable = product.status === 'AVAILABLE';
    const isInactive = product.status === 'INACTIVE';
    const confirmMsg = isAvailable
      ? `Bạn có chắc muốn tạm ẩn sản phẩm "${product.productName}"?`
      : `Bạn có chắc muốn đưa sản phẩm "${product.productName}" trở lại đang bán?`;
    if (!await globalShowConfirm(confirmMsg)) return;

    try {
      setTogglingProduct(product.id);
      if (isAvailable) {
        await productService.deleteProduct(product.id);
        globalShowAlert('Đã tạm ẩn sản phẩm', 'Thành công', 'success');
      } else if (isInactive) {
        await productService.activateProduct(product.id);
        globalShowAlert('Sản phẩm đã được kích hoạt', 'Thành công', 'success');
      }
      fetchData();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể thay đổi trạng thái sản phẩm', 'Lỗi', 'error');
    } finally {
      setTogglingProduct(null);
    }
  };

  const handleToggleBoxActive = async (box: MysteryBox) => {
    const isActive = Boolean(box.isActive && box.isActive !== 0);
    const confirmMsg = isActive
      ? `Bạn có chắc muốn tạm ẩn hộp mù "${box.boxType}"?`
      : `Bạn có chắc muốn mở bán hộp mù "${box.boxType}"?`;
    if (!await globalShowConfirm(confirmMsg)) return;

    try {
      setTogglingBox(box.id);
      if (isActive) {
        await mysteryBoxService.deactivateBox(box.id);
        globalShowAlert('Đã tạm ẩn hộp mù', 'Thành công', 'success');
      } else {
        await mysteryBoxService.activateBox(box.id);
        globalShowAlert('Hộp mù đã được kích hoạt', 'Thành công', 'success');
      }
      fetchData();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Không thể thay đổi trạng thái hộp mù', 'Lỗi', 'error');
    } finally {
      setTogglingBox(null);
    }
  };

  const openBulkMode = () => {
    setBulkMode(true);
    setBulkPct('');
    setBulkStartDate('');
    setBulkEndDate('');
    setBulkSelectedIds(new Set());
    setShowDateOptions(false);
  };

  const closeBulkMode = () => {
    setBulkMode(false);
    setBulkSelectedIds(new Set());
  };

  const toggleBulkSelect = (id: number) => {
    setBulkSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (products: ProductResponse[]) => {
    const ids = products.map(p => p.id);
    const allSelected = ids.every(id => bulkSelectedIds.has(id));
    if (allSelected) {
      setBulkSelectedIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; });
    } else {
      setBulkSelectedIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; });
    }
  };

  const handleBulkApply = async (availableProducts: ProductResponse[]) => {
    const pct = Number(bulkPct);
    if (!pct || pct < 1 || pct > 99) {
      globalShowAlert('Vui lòng nhập % giảm hợp lệ từ 1 đến 99.', 'Nhắc nhở', 'warning');
      return;
    }
    if (bulkSelectedIds.size === 0) {
      globalShowAlert('Vui lòng chọn ít nhất một sản phẩm.', 'Nhắc nhở', 'warning');
      return;
    }
    const confirmed = await globalShowConfirm(
      `Áp dụng giảm ${pct}% cho ${bulkSelectedIds.size} sản phẩm đã chọn?${bulkEndDate ? ` (đến ${bulkEndDate})` : ' (không giới hạn thời gian)'}`
    );
    if (!confirmed) return;

    setIsApplyingBulk(true);
    const selectedProducts = availableProducts.filter(p => bulkSelectedIds.has(p.id));
    const results = await Promise.allSettled(
      selectedProducts.map(p =>
        productService.updateProduct(p.id, {
          productName: p.productName,
          sellingPrice: p.sellingPrice,
          stockQuantity: p.stockQuantity,
          description: p.description,
          categoryId: p.categoryId,
          unit: p.unit,
          discountPercent: pct,
          discountStartDate: bulkStartDate || undefined,
          discountEndDate: bulkEndDate || undefined,
        })
      )
    );
    setIsApplyingBulk(false);

    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      globalShowAlert(`Áp dụng thành công ${bulkSelectedIds.size - failed} sản phẩm. ${failed} sản phẩm thất bại.`, 'Hoàn tất', 'warning');
    } else {
      globalShowAlert(`Đã áp dụng giảm ${pct}% cho ${bulkSelectedIds.size} sản phẩm thành công!`, 'Thành công', 'success');
    }
    closeBulkMode();
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải danh sách sản phẩm...</p>
      </div>
    );
  }

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toString().includes(searchQuery);
    const matchCategory = categoryFilter === '' || p.categoryId === categoryFilter;
    let matchStatus = true;
    if (statusFilter === 'IN_STOCK') matchStatus = (p.status === 'AVAILABLE' || !p.status) && p.stockQuantity > 0;
    if (statusFilter === 'OUT_OF_STOCK') matchStatus = p.stockQuantity <= 0;
    if (statusFilter === 'PENDING') matchStatus = p.status === 'PENDING';
    if (statusFilter === 'INACTIVE') matchStatus = p.status === 'INACTIVE';
    return matchSearch && matchCategory && matchStatus;
  });

  const filteredBoxes = mysteryBoxes.filter(b => {
    const matchSearch = b.boxType.toLowerCase().includes(searchQuery.toLowerCase()) || b.id.toString().includes(searchQuery);
    let matchStatus = true;
    if (statusFilter === 'ACTIVE') matchStatus = Boolean(b.isActive && b.isActive !== 0);
    if (statusFilter === 'INACTIVE') matchStatus = !b.isActive || b.isActive === 0;
    return matchSearch && matchStatus;
  });

  // Calculate generic derived state based on activeTab
  let displayItems: any[] = [];
  if (activeTab === 'NONG_SAN') displayItems = filteredProducts;
  else if (activeTab === 'BLIND_BOX') displayItems = filteredBoxes;

  const totalElements = displayItems.length;
  const totalPages = Math.ceil(totalElements / PAGE_SIZE) || 1;
  const currentPageData = displayItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const pageInfo: PageInfo = {
    page,
    size: PAGE_SIZE,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  };

  const CATEGORY_MAP = [
    { id: 1, name: 'Củ' },
    { id: 2, name: 'Trái cây' },
    { id: 3, name: 'Khác' },
  ];

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Quản Lý Sản Phẩm</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Cửa hàng của bạn đang có {products.length} sản phẩm và {mysteryBoxes.length} hộp mù.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'NONG_SAN' && !bulkMode && (
            <button
              onClick={openBulkMode}
              className="px-5 py-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-100 transition-all"
            >
              <Tag className="size-4" /> Giảm giá hàng loạt
            </button>
          )}
          <button
            id="tour-products-add-btn"
            onClick={() => {
              if (activeTab === 'BLIND_BOX') onNavigate('mystery-box-editor');
              else onNavigate('add-product');
            }}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all"
          >
            <Plus className="size-5" /> Thêm sản phẩm mới
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div id="tour-products-tabs" className="flex bg-white rounded-2xl p-1 border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => { setActiveTab('NONG_SAN'); setPage(0); setCategoryFilter(''); setStatusFilter(''); }}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'NONG_SAN' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          NÔNG SẢN ({products.length})
        </button>
        <button
          onClick={() => { setActiveTab('BLIND_BOX'); setPage(0); setCategoryFilter(''); setStatusFilter(''); }}
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'BLIND_BOX' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          HỘP MÙ ({mysteryBoxes.length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600 font-bold">
          <AlertCircle className="size-6" />
          {error}
        </div>
      )}

      {/* Bulk Discount Panel */}
      {bulkMode && activeTab === 'NONG_SAN' && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-3xl p-6 flex flex-wrap items-end gap-5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="size-10 bg-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Tag className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-orange-800">Giảm giá hàng loạt</p>
              <p className="text-xs text-orange-600 font-medium">Chọn sản phẩm trong bảng rồi nhấn áp dụng</p>
            </div>
          </div>

          {/* % input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">% Giảm giá *</label>
            <div className="relative">
              <input
                type="number" min="1" max="99" placeholder="VD: 20"
                value={bulkPct}
                onChange={e => setBulkPct(e.target.value)}
                className="w-28 px-4 py-2.5 pr-8 bg-white border border-orange-200 rounded-xl text-sm font-black text-orange-800 outline-none focus:ring-2 focus:ring-orange-300"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-orange-500">%</span>
            </div>
          </div>

          {/* Date options toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Thời gian hiệu lực</label>
            <button
              type="button"
              onClick={() => setShowDateOptions(v => !v)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-xs font-bold text-orange-700 hover:bg-orange-50 transition-colors"
            >
              <CalendarDays className="size-3.5" />
              {bulkEndDate ? `Đến ${bulkEndDate}` : 'Không giới hạn'}
              <ChevronDown className={`size-3 transition-transform ${showDateOptions ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Selected count */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Đã chọn</label>
            <div className="px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-sm font-black text-orange-800">
              {bulkSelectedIds.size} sản phẩm
            </div>
          </div>

          {/* Apply & Cancel */}
          <button
            onClick={() => handleBulkApply(filteredProducts)}
            disabled={isApplyingBulk || bulkSelectedIds.size === 0 || !bulkPct}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm flex items-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isApplyingBulk ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Áp dụng
          </button>
          <button onClick={closeBulkMode} className="px-5 py-2.5 bg-white border border-orange-200 rounded-xl text-sm font-bold text-orange-700 hover:bg-orange-50 transition-colors flex items-center gap-1.5">
            <X className="size-4" /> Hủy
          </button>

          {/* Date range pickers */}
          {showDateOptions && (
            <div className="w-full flex flex-wrap items-end gap-5 pt-4 border-t border-orange-200">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Ngày bắt đầu (để trống = ngay lập tức)</label>
                <input
                  type="date"
                  value={bulkStartDate}
                  onChange={e => setBulkStartDate(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-sm font-bold text-orange-800 outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Ngày kết thúc (để trống = vô hạn)</label>
                <input
                  type="date"
                  value={bulkEndDate}
                  onChange={e => setBulkEndDate(e.target.value)}
                  min={bulkStartDate || undefined}
                  className="px-4 py-2.5 bg-white border border-orange-200 rounded-xl text-sm font-bold text-orange-800 outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              {bulkEndDate && (
                <button onClick={() => { setBulkStartDate(''); setBulkEndDate(''); }} className="text-xs text-orange-500 font-bold hover:underline">
                  Xóa thời gian
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div id="tour-products-search" className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div id="tour-products-filter-bar" className="p-6 border-b border-gray-50 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm tên sản phẩm hoặc ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 transition-all" 
            />
          </div>
          
          {activeTab === 'NONG_SAN' && (
            <select 
              value={categoryFilter} 
              onChange={(e) => { 
                const val = e.target.value;
                setCategoryFilter(val ? Number(val) : ''); 
                setPage(0); 
              }}
              className="px-6 py-3 bg-gray-50 border border-gray-100 focus:border-primary/20 rounded-2xl text-xs font-bold text-gray-600 outline-none cursor-pointer"
            >
              <option value="">Tất cả danh mục</option>
              {CATEGORY_MAP.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          {activeTab !== 'BLIND_BOX' && (
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="px-6 py-3 bg-gray-50 border border-gray-100 focus:border-primary/20 rounded-2xl text-xs font-bold text-gray-600 outline-none cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              {activeTab === 'NONG_SAN' && (
                <>
                  <option value="IN_STOCK">Đang bán (Còn hàng)</option>
                  <option value="OUT_OF_STOCK">Hết hàng</option>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="INACTIVE">Tạm ẩn</option>
                </>
              )}
              {activeTab === 'BLIND_BOX' && (
                <>
                  <option value="ACTIVE">Đang Mở</option>
                  <option value="INACTIVE">Đã Ẩn</option>
                </>
              )}
            </select>
          )}
          <button className="size-11 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-500 hover:bg-gray-100 transition-colors">
            <Filter className="size-5" />
          </button>
        </div>

        <div id="tour-products-table" className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                {bulkMode && activeTab === 'NONG_SAN' && (
                  <th className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      className="size-4 accent-orange-500 cursor-pointer"
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => bulkSelectedIds.has(p.id))}
                      onChange={() => handleSelectAll(filteredProducts)}
                      title="Chọn tất cả"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{activeTab === 'NONG_SAN' ? 'Sản phẩm' : 'Tên Combo / Hộp mù'}</th>
                {activeTab === 'NONG_SAN' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Unit / DVT</th>}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Giá bán</th>
                {activeTab === 'NONG_SAN' && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tồn kho (kg)</th>}
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTab === 'NONG_SAN' && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-10 text-center text-gray-400 font-bold">Không tìm thấy sản phẩm nào. {products.length === 0 && 'Hãy thêm sản phẩm mới!'}</td>
                </tr>
              )}
              {activeTab === 'NONG_SAN' && currentPageData.map((p, idx) => {
                const stockKg = p.stockKg ?? p.stockQuantity ?? 0;
                const isOut = stockKg <= 0;
                return (
                  <tr
                    key={p.id}
                    id={idx === 0 ? 'tour-products-first-row' : undefined}
                    className={`hover:bg-gray-50/50 transition-colors ${bulkMode && bulkSelectedIds.has(p.id) ? 'bg-orange-50/60' : ''}`}
                    onClick={bulkMode ? () => toggleBulkSelect(p.id) : undefined}
                    style={bulkMode ? { cursor: 'pointer' } : undefined}
                  >
                    {bulkMode && (
                      <td className="px-4 py-5">
                        <input
                          type="checkbox"
                          className="size-4 accent-orange-500 cursor-pointer"
                          checked={bulkSelectedIds.has(p.id)}
                          onChange={() => toggleBulkSelect(p.id)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                    )}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <img src={p.imageUrl || 'https://picsum.photos/seed/product/80/80'} className="size-12 rounded-2xl object-cover shadow-sm bg-gray-100" />
                        <div>
                          <p className="text-sm font-black text-gray-900 line-clamp-1 max-w-[200px]">{p.productName}</p>
                          <p className="text-[10px] text-gray-400 font-bold tracking-wider">ID: {p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase">kg</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {p.salePrice != null && p.salePrice > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-500 line-through font-semibold">{((p.pricePerKg ?? p.sellingPrice) || 0).toLocaleString('vi-VN')}đ/kg</span>
                            <span className="bg-primary text-white text-[8px] font-black px-1 py-0.5 rounded-full">-{p.discountPercent}%</span>
                          </div>
                          <span className="text-sm font-black text-primary">{p.salePrice.toLocaleString('vi-VN')}đ/kg</span>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-primary">{((p.pricePerKg ?? p.sellingPrice) || 0).toLocaleString('vi-VN')}đ/kg</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`text-sm font-black ${isOut ? 'text-red-500' : 'text-gray-800'}`}>{stockKg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span>
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${isOut ? 'bg-red-500' : 'bg-primary'}`} style={{ width: isOut ? '0%' : '60%' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        p.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600' :
                        p.status === 'INACTIVE' ? 'bg-orange-50 text-orange-500' :
                        isOut ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'
                      }`}>
                        {p.status === 'PENDING' ? 'Chờ duyệt' :
                         p.status === 'INACTIVE' ? 'Tạm ẩn' :
                         isOut ? 'Hết hàng' : 'Đang bán'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div id={idx === 0 ? 'tour-products-action-btns' : undefined} className="flex flex-col items-end gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate(`edit-product/${p.id}`)}
                            disabled={togglingProduct === p.id}
                            title="Chỉnh sửa sản phẩm"
                            className="size-9 bg-gray-50 text-primary rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Edit3 className="size-4" />
                          </button>
                          {(p.status === 'AVAILABLE' || p.status === 'INACTIVE') && (
                            <button
                              onClick={() => handleToggleProductActive(p)}
                              disabled={togglingProduct === p.id}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-colors disabled:opacity-50 cursor-pointer min-w-[72px] flex items-center justify-center ${
                                p.status === 'AVAILABLE'
                                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                            >
                              {togglingProduct === p.id
                                ? <Loader2 className="size-4 animate-spin" />
                                : p.status === 'AVAILABLE' ? 'Tạm ẩn' : 'Đang bán'
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Mystery Box Rows */}
              {activeTab === 'BLIND_BOX' && currentPageData.map((box) => {
                const isActive = Boolean(box.isActive && box.isActive !== 0);
                return (
                <tr key={box.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl overflow-hidden shadow-sm bg-purple-500 flex items-center justify-center text-white flex-shrink-0">
                        {box.imageUrl
                          ? <img src={box.imageUrl} className="w-full h-full object-cover" />
                          : <Sparkles className="size-6" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-black line-clamp-1 max-w-[200px] text-purple-700">{box.boxType}</p>
                        <p className="text-[10px] text-gray-400 font-bold tracking-wider">ID: {box.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-black text-gray-800">{(box.price || 0).toLocaleString('vi-VN')}đ</td>
                  <td className="px-6 py-5 text-center">
                    {isActive
                      ? <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-green-50 text-green-600">Đang Mở</span>
                      : <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-gray-100 text-gray-400">Đã Ẩn</span>
                    }
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onNavigate(`mystery-box-editor/${box.id}`)} disabled={togglingBox === box.id} className="size-9 bg-gray-50 text-primary rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer">
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        onClick={() => handleToggleBoxActive(box)}
                        disabled={togglingBox === box.id}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-colors disabled:opacity-50 cursor-pointer min-w-[72px] flex items-center justify-center ${
                          isActive
                            ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {togglingBox === box.id
                          ? <Loader2 className="size-4 animate-spin" />
                          : isActive ? 'Tạm ẩn' : 'Đang bán'
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
              {activeTab === 'BLIND_BOX' && filteredBoxes.length === 0 && (
                <tr><td colSpan={4} className="px-10 py-10 text-center text-gray-400 font-bold">Không tìm thấy Hộp mù nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-white border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Hiển thị {currentPageData.length} mục trên tổng số {totalElements} mục
          </p>
        </div>
        {totalElements > 0 && (
          <Pagination pageInfo={pageInfo} onPageChange={setPage} className="px-6" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Đang kinh doanh', value: `${products.length} sản phẩm`, icon: CheckCircle, color: 'text-primary bg-primary/5' },
          { label: 'Hết hàng', value: `${products.filter(p => !p.stockQuantity).length} sản phẩm`, icon: Clock, color: 'text-red-500 bg-red-50/50' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center gap-5">
            <div className={`size-14 rounded-2xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="size-7" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h4 className={`text-xl font-black ${stat.color.split(' ')[0]}`}>{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
