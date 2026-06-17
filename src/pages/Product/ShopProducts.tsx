import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Grid,
  List,
  Filter,
  Star,
  ShoppingCart,
  Heart,
  MessageCircle,
  Clock,
  Package,
  TrendingUp,
  Loader2,
  MapPin,
  ShieldCheck,
  Award,
  Gift,
  ChefHat,
  Tag,
} from 'lucide-react';
import { productService, ProductResponse, userService, UserResponse, cartService, reviewService, ReviewResponse, mysteryBoxService, MysteryBox, comboService, BuildComboResponse } from '../../services';
import { globalShowAlert } from '../../contexts/PopupContext';

interface ShopProductsProps {
  shopId: number;
  onBack: () => void;
  isAuthenticated?: boolean;
  onOpenLogin?: () => void;
}

const ShopProducts: React.FC<ShopProductsProps> = ({
  shopId,
  onBack,
  isAuthenticated = false,
  onOpenLogin = () => { }
}) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [mysteryBoxes, setMysteryBoxes] = useState<MysteryBox[]>([]);
  const [combos, setCombos] = useState<BuildComboResponse[]>([]);
  const [shopInfo, setShopInfo] = useState<UserResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [addingToCart, setAddingToCart] = useState<number | null>(null);
  const [addingBoxToCart, setAddingBoxToCart] = useState<number | null>(null);
  const [addingComboToCart, setAddingComboToCart] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const fetchShopData = async () => {
      setLoading(true);
      console.log('[ShopProducts] Fetching data for shopId:', shopId);
      try {
        const [productsRes, shopRes, reviewsRes, boxesRes, combosRes] = await Promise.all([
          productService.getForBuyer().catch(() => ({ result: [] })),
          userService.getUserById(shopId).catch(() => ({ result: null })),
          reviewService.getByShopId(shopId).catch(() => ({ result: [] })),
          mysteryBoxService.getForBuyer().catch(() => ({ result: [] })),
          comboService.getByShop(shopId).catch(() => ({ result: [] }))
        ]);

        if (productsRes.result) {
          setProducts(
            productsRes.result.filter((p: ProductResponse) =>
              (p.shopOwnerId === shopId || p.shopId === shopId)
            )
          );
        }
        if (reviewsRes.result) {
          setReviews(reviewsRes.result);
        }
        if (shopRes.result) {
          setShopInfo(shopRes.result);
        }
        // Filter mystery boxes belonging to this shop and only active ones
        if (boxesRes.result) {
          setMysteryBoxes(
            boxesRes.result.filter((b: MysteryBox) => b.shopOwnerId === shopId)
          );
        }
        if (combosRes.result) {
          setCombos(combosRes.result);
        }
      } catch (error) {
        console.error('Failed to load shop data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [shopId]);

  const handleAddToCart = async (productId: number) => {
    if (!isAuthenticated) { onOpenLogin(); return; }
    setAddingToCart(productId);
    try {
      await cartService.addToCart({ productId, quantity: 1 });
      globalShowAlert('Đã thêm vào giỏ hàng!', 'Thành công', 'success');
    } catch (error) {
      globalShowAlert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleAddBoxToCart = async (boxId: number) => {
    if (!isAuthenticated) { onOpenLogin(); return; }
    setAddingBoxToCart(boxId);
    try {
      await cartService.addToCart({ mysteryBoxId: boxId, quantity: 1 });
      window.dispatchEvent(new Event('cart-updated'));
      globalShowAlert('Đã thêm túi mù vào giỏ hàng!', 'Thành công', 'success');
    } catch (error) {
      globalShowAlert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setAddingBoxToCart(null);
    }
  };

  const handleAddComboToCart = async (combo: BuildComboResponse) => {
    if (!isAuthenticated) { onOpenLogin(); return; }
    setAddingComboToCart(combo.id);
    try {
      await cartService.addToCart({ buildComboId: combo.id, quantity: 1 });
      window.dispatchEvent(new Event('cart-updated'));
      globalShowAlert(`Đã thêm combo "${combo.comboName}" vào giỏ hàng!`, 'Thành công', 'success');
    } catch {
      globalShowAlert('Không thể thêm combo vào giỏ hàng. Vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setAddingComboToCart(null);
    }
  };

  const handleChatNow = () => {
    if (!isAuthenticated) { onOpenLogin(); return; }
    window.dispatchEvent(new CustomEvent('open-chat-with-user', {
      detail: { userId: shopId, userName: shopName }
    }));
  };

  // Filter and sort products
  const categories = Array.from(new Set(products.map(p => p.unit || 'Khác')));

  let filteredProducts = selectedCategory
    ? products.filter(p => (p.unit || 'Khác') === selectedCategory)
    : products;

  if (sortBy === 'asc') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.sellingPrice - b.sellingPrice);
  } else if (sortBy === 'desc') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.sellingPrice - a.sellingPrice);
  } else if (sortBy === 'name') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.productName.localeCompare(b.productName));
  }

  const activeProducts = products.filter(p => p.stockQuantity > 0).length;

  // Calculate average rating
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, rev) => acc + rev.ratingStar, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const averageRating = calculateAverageRating();

  // Get shop name from shopInfo first, then from first product, then fallback
  const shopName = shopInfo?.shopName
    || shopInfo?.fullName
    || (products.length > 0 ? products[0].shopName : null)
    || 'Cửa hàng';

  console.log('[ShopProducts] Display shopName:', shopName, {
    fromShopInfo: shopInfo?.shopName || shopInfo?.fullName,
    fromProduct: products.length > 0 ? products[0].shopName : null,
    productsCount: products.length
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">Đang tải thông tin cửa hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Quay lại
          </button>
          <h3 className="font-black text-gray-900 text-lg">{shopName}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-400'
                }`}
            >
              <Grid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-400'
                }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Shop Info Card */}
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Shop Avatar */}
            <div className="size-20 rounded-2xl overflow-hidden bg-gradient-to-br from-green-100 to-blue-100 flex-shrink-0 border-4 border-white shadow-lg">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(shopName)}&background=63b34a&color=fff&size=200&bold=true`}
                alt={shopName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Shop Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 mb-1">{shopName}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {shopInfo?.status === 'ACTIVE' && (
                      <span className="flex items-center gap-1 text-primary font-bold">
                        <ShieldCheck className="size-3.5" />
                        Đã xác thực
                      </span>
                    )}
                    {shopInfo?.address && (
                      <span className="flex items-center gap-1 text-gray-600 font-medium">
                        <MapPin className="size-3.5" />
                        {shopInfo.address}
                      </span>
                    )}
                  </div>
                </div>
                <button className="text-red-500 hover:scale-110 transition-transform">
                  <Heart className="size-5" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="size-4 text-blue-600" />
                    <span className="text-lg font-black text-gray-900">{products.length}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Sản phẩm</p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="size-4 text-primary" />
                    <span className="text-lg font-black text-gray-900">{activeProducts}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Đang bán</p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="size-4 text-yellow-600" />
                    <span className="text-lg font-black text-gray-900">
                      {reviews.length > 0 ? averageRating : 'N/A'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">
                    Đánh giá {reviews.length > 0 && `(${reviews.length})`}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="size-4 text-purple-600" />
                    <span className="text-lg font-black text-gray-900">Online</span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Trạng thái</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleChatNow}
                  className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <MessageCircle className="size-3.5" />
                  Chat ngay
                </button>
                <button className="px-4 py-2 bg-white text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 border border-gray-200">
                  <Heart className="size-3.5" />
                  Theo dõi
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          {shopInfo?.description && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100">
              <p className="text-sm text-gray-600 font-medium">{shopInfo.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filter */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
              <div className="flex items-center gap-2 mb-5">
                <Filter className="size-4 text-primary" />
                <h3 className="font-black text-gray-900 text-sm">Bộ lọc</h3>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <h4 className="font-black text-gray-700 text-xs mb-3 uppercase">Đơn vị</h4>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition-all ${selectedCategory === null
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  Tất cả ({products.length})
                </button>
                {categories.map(cat => {
                  const count = products.filter(p => (p.unit || 'Khác') === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-bold text-xs transition-all ${selectedCategory === cat
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              {/* Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-600">
                  Hiển thị <span className="text-primary font-black">{filteredProducts.length}</span> sản phẩm
                </p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <option value="default">Mặc định</option>
                  <option value="name">Tên A-Z</option>
                  <option value="asc">Giá: Thấp → Cao</option>
                  <option value="desc">Giá: Cao → Thấp</option>
                </select>
              </div>

              {/* Products */}
              {filteredProducts.length > 0 ? (
                <div className={`grid gap-5 ${viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
                  }`}>
                  {filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className={`group ${viewMode === 'list' ? 'flex gap-4' : ''
                        }`}
                    >
                      {/* Image */}
                      <div className={`relative ${viewMode === 'list' ? 'w-32 h-32' : 'aspect-square'
                        } rounded-xl overflow-hidden bg-gray-100 border border-gray-100 group-hover:border-primary/50 transition-all flex-shrink-0`}>
                        <img
                          src={product.imageUrl || `https://picsum.photos/seed/${product.id}/400/400`}
                          alt={product.productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.stockQuantity <= 0 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-xs font-black">Hết hàng</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleAddToCart(product.id)}
                          disabled={product.stockQuantity <= 0 || addingToCart === product.id}
                          className={`absolute ${viewMode === 'list' ? 'bottom-2 right-2 size-8' : 'bottom-3 right-3 size-10'
                            } bg-primary text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {addingToCart === product.id ? (
                            <Loader2 className={`${viewMode === 'list' ? 'size-4' : 'size-5'} animate-spin`} />
                          ) : (
                            <ShoppingCart className={viewMode === 'list' ? 'size-4' : 'size-5'} />
                          )}
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex-1 mt-3">
                        <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                          {product.productName}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium mb-2">{product.unit}</p>

                        <div className="flex flex-col gap-0.5 mb-2">
                          {product.salePrice != null && product.salePrice > 0 ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-red-500 line-through font-semibold">{(product.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
                                <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">-{product.discountPercent}%</span>
                              </div>
                              <span className="text-lg font-black text-primary">{product.salePrice.toLocaleString('vi-VN')}đ</span>
                            </>
                          ) : (
                            <span className="text-lg font-black text-primary">{(product.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 font-medium">
                            Còn: {product.stockQuantity} {product.unit}
                          </span>
                          {product.stockQuantity > 0 ? (
                            <span className="text-[10px] text-primary font-bold">Còn hàng</span>
                          ) : (
                            <span className="text-[10px] text-red-600 font-bold">Hết hàng</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <Package className="size-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Không có sản phẩm nào</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mystery Boxes Section */}
        {mysteryBoxes.length > 0 && (
          <div className="mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="size-9 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Gift className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Túi Mù Của Shop</h3>
                  <p className="text-xs text-gray-400 font-bold">{mysteryBoxes.length} túi mù đang bán</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {mysteryBoxes.map((box) => (
                  <div key={box.id} className="group relative bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all">
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-purple-100">
                      {box.imageUrl ? (
                        <img src={box.imageUrl} alt={box.boxType} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-purple-300">
                          <Gift className="size-16" />
                          <span className="text-4xl font-black text-purple-200">?</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <Gift className="size-3 text-yellow-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Bí ẩn</span>
                      </div>
                      <button
                        onClick={() => handleAddBoxToCart(box.id)}
                        disabled={addingBoxToCart === box.id}
                        className="absolute bottom-3 right-3 size-10 bg-primary text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95 disabled:opacity-50"
                      >
                        {addingBoxToCart === box.id ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <ShoppingCart className="size-5" />
                        )}
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h4 className="font-black text-gray-800 text-sm mb-1 line-clamp-1">{box.boxType}</h4>
                      {box.description && (
                        <p className="text-xs text-gray-500 font-medium mb-2 line-clamp-2">{box.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-black text-primary">{box.price.toLocaleString('vi-VN')}đ</span>
                        <button
                          onClick={() => handleAddBoxToCart(box.id)}
                          disabled={addingBoxToCart === box.id}
                          className="px-3 py-1.5 bg-primary text-white text-[10px] font-black rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {addingBoxToCart === box.id ? <Loader2 className="size-3 animate-spin" /> : <ShoppingCart className="size-3" />}
                          Thêm vào giỏ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Combos Section */}
        {combos.length > 0 && (
          <div className="mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="size-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <ChefHat className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">Combo Nấu Ăn</h3>
                  <p className="text-xs text-gray-400 font-bold">{combos.length} combo đang bán</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {combos.map((combo) => {
                  const totalOriginal = combo.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                  const savings = totalOriginal - combo.discountPrice;
                  return (
                    <div key={combo.id} onClick={() => navigate(`/combo/${combo.id}`)} className="group bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 overflow-hidden hover:shadow-lg hover:border-green-200 transition-all cursor-pointer">
                      {/* Header */}
                      <div className="p-4 flex items-center gap-3 border-b border-green-100">
                        <div className="size-11 bg-white rounded-xl flex items-center justify-center shadow-sm border border-green-100 overflow-hidden flex-shrink-0">
                          {combo.imageUrl
                            ? <img src={combo.imageUrl} className="w-full h-full object-cover" alt={combo.comboName} />
                            : <ChefHat className="size-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-gray-900 text-sm truncate">{combo.comboName}</h4>
                          {combo.region && (
                            <span className="inline-block text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-0.5">
                              {combo.region === 'MIEN_BAC' ? '🌿 Miền Bắc' : combo.region === 'MIEN_TRUNG' ? '🌶 Miền Trung' : '🥥 Miền Nam'}
                            </span>
                          )}
                          {combo.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{combo.description}</p>
                          )}
                        </div>
                        {savings > 0 && (
                          <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap">
                            -{Math.round((savings / totalOriginal) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Items list */}
                      <div className="px-4 py-3 space-y-1.5">
                        {combo.items.map((item) => (
                          <div key={item.productId} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 font-medium truncate flex-1 pr-2">• {item.productName}</span>
                            <span className="text-gray-500 font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="px-4 pb-4 pt-2">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-lg font-black text-primary">{combo.discountPrice.toLocaleString('vi-VN')}đ</span>
                            {savings > 0 && (
                              <p className="text-[10px] text-primary font-bold flex items-center gap-1 mt-0.5">
                                <Tag className="size-3" /> Tiết kiệm {savings.toLocaleString('vi-VN')}đ
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/combo/${combo.id}`); }}
                          className="w-full px-3 py-2 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ChefHat className="size-3.5" />
                          Chọn combo này
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Đánh giá từ khách hàng</h3>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    {reviews.length} đánh giá • Trung bình {averageRating}/5.0
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`size-5 ${i < Math.round(Number(averageRating)) ? 'fill-yellow-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-2xl font-black text-gray-900">{averageRating}</span>
                </div>
              </div>

              <div className="space-y-6">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="flex gap-4 pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                    {/* Avatar */}
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm border border-primary/20 shrink-0">
                      {review.fullName ? review.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">
                            {review.fullName || `Khách hàng #${review.buyerId}`}
                          </h4>
                          <div className="flex text-yellow-400 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`size-3 ${i < review.ratingStar ? 'fill-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          Đơn #{review.orderDetailId}
                        </span>
                      </div>

                      <p className="text-gray-700 text-sm leading-relaxed mb-3">{review.comment}</p>

                      {/* Shop Reply */}
                      {review.replyFromShop && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="size-5 bg-primary rounded-full flex items-center justify-center text-white">
                              <MessageCircle className="size-3" />
                            </div>
                            <span className="text-xs font-black text-gray-900">Phản hồi từ Shop</span>
                          </div>
                          <p className="text-gray-600 text-sm pl-7 italic">{review.replyFromShop}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {reviews.length > 5 && (
                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <p className="text-sm text-gray-500 font-medium">
                    Hiển thị 5/{reviews.length} đánh giá
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopProducts;
