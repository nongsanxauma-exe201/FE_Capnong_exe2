
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  ShoppingCart,
  ChevronRight,
  Plus,
  Minus,
  Heart,
  Share2,
  Loader2,
  AlertCircle,
  MessageSquare,
  ChefHat
} from 'lucide-react';
import { productService, ProductResponse, cartService, reviewService, ReviewResponse, comboService, BuildComboResponse } from '../../services';
import { userService } from '../../services';
import { UserResponse } from '../../services/auth.service';
import { globalShowAlert } from '../../contexts/PopupContext';
import ShopProducts from './ShopProducts';
import { useAuth } from '../../contexts/AuthContext';

interface ProductDetailProps {
  productId?: string;
  onBack?: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ productId: propProductId, onBack: propOnBack }) => {
  const { productId: urlProductId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const productId = propProductId || urlProductId || '';

  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductResponse[]>([]);
  const [shopCombos, setShopCombos] = useState<BuildComboResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('Mô tả chi tiết');
  const [viewShopMode, setViewShopMode] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [shopReviews, setShopReviews] = useState<ReviewResponse[]>([]);
  const [shopOwner, setShopOwner] = useState<UserResponse | null>(null);

  const handleBack = () => {
    if (propOnBack) propOnBack();
    else navigate('/');
  };

  useEffect(() => {
   const fetchProductDetails = async () => {
  try {
    setIsLoading(true);
    setError(null);

    const idNum = Number(productId);

    if (!idNum || isNaN(idNum)) {
      setError('ID sản phẩm không hợp lệ.');
      return;
    }

    const buyerProductsRes = await productService.getForBuyer();
    const buyerProducts = buyerProductsRes.result || [];

    const foundProduct = buyerProducts.find((p) => p.id === idNum);

    if (!foundProduct) {
      setProduct(null);
      setError('Sản phẩm hiện không khả dụng hoặc cửa hàng đang tạm đóng.');
      return;
    }

    setProduct(foundProduct);

    setRelatedProducts(
      buyerProducts
        .filter((p) => p.id !== idNum)
        .slice(0, 4)
    );

    const shopId = foundProduct.shopOwnerId || foundProduct.shopId;

    if (shopId) {
      try {
        const comboRes = await comboService.getByShop(shopId);
        if (comboRes.result) {
          setShopCombos(comboRes.result);
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error('Failed to fetch product detail:', err);
    setError('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.');
  } finally {
    setIsLoading(false);
  }
};

  if (productId) fetchProductDetails();
}, [productId]);

useEffect(() => {
  const fetchReviews = async () => {
    if (!product?.id) return;
    try {
      setIsReviewsLoading(true);
      console.log('[ProductDetail] Fetching reviews for product ID:', product.id);

      // Try to fetch reviews for this specific product
      try {
        const res = await reviewService.getByProductId(product.id);
        console.log('[ProductDetail] Product reviews response:', res);
        if (res.result) {
          console.log('[ProductDetail] Product reviews found:', res.result.length, res.result);
          console.log('[ProductDetail] Setting reviews to state:', res.result);
          setReviews(res.result);
          console.log('[ProductDetail] Reviews state should be updated');
          return;
        }
      } catch (productErr) {
        console.warn('[ProductDetail] getByProductId not available, falling back to shop reviews:', productErr);
      }

      // Fallback: Get all shop reviews and filter by productId
      if (product.shopId) {
        console.log('[ProductDetail] Fetching shop reviews and filtering...');
        const shopRes = await reviewService.getByShopId(product.shopId);
        console.log('[ProductDetail] Shop reviews response:', shopRes);
        if (shopRes.result) {
          console.log('[ProductDetail] All shop reviews:', shopRes.result);
          console.log('[ProductDetail] Looking for reviews with productId:', product.id);

          // Log each review to see what fields it has
          shopRes.result.forEach((r, idx) => {
            console.log(`[ProductDetail] Review ${idx}:`, {
              id: r.id,
              productId: r.productId,
              orderDetailId: r.orderDetailId,
              allFields: Object.keys(r)
            });
          });

          // Filter reviews that have productId matching current product
          const productReviews = shopRes.result.filter(r => r.productId === product.id);
          console.log('[ProductDetail] Filtered product reviews:', productReviews.length, productReviews);
          setReviews(productReviews);
        }
      }
    } catch (err) {
      console.error('[ProductDetail] Failed to fetch reviews:', err);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  if (product?.id) fetchReviews();
}, [product?.id, product?.shopId]);

// Fetch shop reviews for shop rating display
useEffect(() => {
  const fetchShopReviews = async () => {
    if (!product?.shopId) return;
    try {
      const res = await reviewService.getByShopId(product.shopId);
      if (res.result) {
        setShopReviews(res.result);
      }
    } catch (err) {
      console.error('Failed to fetch shop reviews:', err);
    }
  };

  if (product?.shopId) fetchShopReviews();
}, [product?.shopId]);

// Fetch shop owner info for real avatar and join date
useEffect(() => {
  const fetchShopOwner = async () => {
    const ownerId = product?.shopOwnerId || product?.shopId;
    if (!ownerId) return;
    try {
      const res = await userService.getUserById(ownerId);
      if (res.result) setShopOwner(res.result);
    } catch (err) {
      console.error('Failed to fetch shop owner info:', err);
    }
  };
  if (product) fetchShopOwner();
}, [product?.shopOwnerId, product?.shopId]);

if (viewShopMode && selectedShopId) {
  return <ShopProducts shopId={selectedShopId} onBack={() => setViewShopMode(false)} isAuthenticated={isAuthenticated} onOpenLogin={() => navigate('/login')} />;
}

if (isLoading) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] gap-4 w-full">
      <Loader2 className="size-10 text-primary animate-spin" />
      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải sản phẩm chi tiết...</p>
    </div>
  );
}

if (error || !product) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 w-full px-4">
      <div className="bg-red-50 border border-red-100 p-8 rounded-3xl flex flex-col items-center gap-4 text-red-600 font-bold max-w-lg text-center">
        <AlertCircle className="size-10" />
        <p>{error || 'Sản phẩm không khả dụng'}</p>
        <button onClick={handleBack} className="mt-4 px-6 py-2 bg-white text-red-600 rounded-xl shadow-sm hover:shadow-md transition-shadow">Quay lại trang chủ</button>
      </div>
    </div>
  );
}

const farmName = product.shopName || (product.shopId ? `Nông trại #${product.shopId}` : 'Nông trại đối tác');
const isOutOfStock = product.stockQuantity <= 0;

return (
  <div className="flex-1 bg-white pb-20">
    <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between border-b border-gray-100 mb-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <span className="cursor-pointer hover:text-primary" onClick={handleBack}>Trang chủ</span>
        <ChevronRight className="size-4" />
        <span className="text-gray-900 font-medium">{product.productName}</span>
      </nav>
    </div>

    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 animate-in fade-in duration-500">
      <div className="flex">
        <div className="flex-1 relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <img src={product.imageUrl || 'https://picsum.photos/seed/product/400/400'} className="w-full h-full object-cover" alt={product.productName} />
          {isOutOfStock ? (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Hết hàng</span>
          ) : (
            <span className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Tươi mới</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Danh mục: Nông sản</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {product.id}</span>
          </div>
          <h1 className="text-3xl font-black font-display text-gray-800 mb-2 leading-tight">{product.productName}</h1>
          <div className="flex items-center gap-4 text-sm mt-3">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => {
                // Calculate average rating from this product's reviews only
                const avg = reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.ratingStar, 0) / reviews.length : 0;
                return <Star key={i} className={`size-4 ${i < Math.round(avg) ? 'fill-yellow-400' : ''}`} />;
              })}
            </div>
            <span className="text-gray-400 font-bold text-xs">
              {reviews.length > 0 ? `${reviews.length} đánh giá` : 'Chưa có đánh giá'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <div className="flex items-center gap-3">
            <span className="text-primary font-black text-4xl">{(product.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
            <span className="text-gray-400 font-bold uppercase text-xs mt-2">/ {product.unit || 'KG'}</span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mt-6 whitespace-pre-wrap">
            {product.description || "Sản phẩm sạch được thu hoạch ngay tại vườn."}
          </p>
        </div>

        <div className="space-y-3 pt-6">
          <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest flex items-center justify-between">
            <span>Số lượng</span>
            <span className={`lowercase font-medium ${isOutOfStock ? 'text-red-500' : 'text-gray-500'}`}>{product.stockQuantity} {product.unit} có sẵn</span>
          </p>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden h-14">
            <button disabled={isOutOfStock} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-50"><Minus className="size-4" /></button>
            <input type="text" value={isOutOfStock ? 0 : quantity} readOnly className="w-12 text-center font-black bg-transparent outline-none text-gray-800" />
            <button disabled={isOutOfStock || quantity >= product.stockQuantity} onClick={() => setQuantity(quantity + 1)} className="w-12 h-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-50"><Plus className="size-4" /></button>
          </div>
          <button
            disabled={isOutOfStock || isAdding}
            onClick={async () => {
              if (!isAuthenticated) navigate('/login');
              else {
                try {
                  setIsAdding(true);
                  await cartService.addToCart({ productId: Number(productId), quantity });
                  window.dispatchEvent(new Event('cart-updated'));
                  globalShowAlert(`Đã thêm ${quantity} ${product.unit} ${product.productName} vào giỏ hàng`, 'Thành công', 'success');
                } catch (e) {
                  console.error('Failed to add to cart', e);
                  globalShowAlert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.', 'Lỗi', 'error');
                } finally {
                  setIsAdding(false);
                }
              }
            }}
            className="flex-1 bg-primary text-white h-14 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 disabled:bg-gray-300 disabled:text-gray-500 hover:-translate-y-1 transform disabled:transform-none"
          >
            {isAdding ? <Loader2 className="size-5 animate-spin" /> : <ShoppingCart className="size-5" />}
            {isAdding ? 'Đang thêm...' : (isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ')}
          </button>
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 mb-20">
      <div className="bg-gradient-to-br from-green-50 to-white rounded-[32px] border border-green-100 shadow-sm p-10 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          <div className="flex items-start gap-5">
            <div className="size-24 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0 border-4 border-white">
              <img src={shopOwner?.logoUrl || `https://picsum.photos/seed/shop${product.shopOwnerId}/100/100`} alt={farmName} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 pt-1">
              <h4 className="font-black text-gray-900 text-lg mb-1">{farmName}</h4>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { if (product.shopId) { setViewShopMode(true); setSelectedShopId(product.shopId); } }} className="px-5 py-2.5 bg-white text-primary font-black text-[10px] uppercase tracking-widest rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm">Xem Cửa Hàng</button>
                <button
                  onClick={() => {
                    if (!isAuthenticated) { navigate('/login'); return; }
                    if (product.shopId) {
                      window.dispatchEvent(new CustomEvent('open-chat-with-user', {
                        detail: { userId: product.shopId, userName: product.shopName || 'Chủ shop' }
                      }));
                    }
                  }}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-blue-100 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                >
                  <MessageSquare className="size-3.5" /> Chat Shop
                </button>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 flex items-center">
            <div className="grid grid-cols-3 gap-8 w-full bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-center">
                <p className="text-2xl font-black text-primary mb-1">
                  {shopReviews.length > 0
                    ? (shopReviews.reduce((acc, r) => acc + r.ratingStar, 0) / shopReviews.length).toFixed(1)
                    : '5.0'
                  }
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Đánh Giá ({shopReviews.length > 0 ? shopReviews.length : 0})
                </p>
              </div>
              <div className="text-center border-l border-r border-gray-100 px-4">
                <p className="text-2xl font-black text-gray-900 mb-1">
                  {shopReviews.length > 0
                    ? `${Math.round((shopReviews.filter(r => r.replyFromShop).length / shopReviews.length) * 100)}%`
                    : 'N/A'
                  }
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tỉ Lệ Phản Hồi</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900 mb-1">
                  {(() => {
                    const joinDate = shopOwner?.createAt || shopOwner?.createdAt;
                    if (!joinDate) return 'N/A';
                    const years = Math.floor((Date.now() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24 * 365));
                    return years > 0 ? `${years} Năm` : 'Mới tham gia';
                  })()}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tham Gia</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 border-t border-gray-100 pt-16 mb-20">
      <div className="flex justify-center gap-12 -mt-px mb-12">
        {['Mô tả chi tiết', 'Chứng nhận', 'Đánh giá '].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{tab}</button>
        ))}
      </div>
      <div className="max-w-4xl mx-auto">
        {activeTab === 'Mô tả chi tiết' && <div className="text-gray-600 text-sm leading-loose whitespace-pre-wrap bg-gray-50 p-8 rounded-[32px] border border-gray-100">{product.description || "Nông sản sạch tận vườn."}</div>}

        {activeTab.startsWith('Đánh giá') && (
          <div className="space-y-8">
            {(() => {
              console.log('[ProductDetail] Rendering reviews tab. isReviewsLoading:', isReviewsLoading, 'reviews.length:', reviews.length, 'reviews:', reviews);
              return null;
            })()}
            {isReviewsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => {
                console.log('[ProductDetail] Rendering review:', review);
                return (
                  <div key={review.id} className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {review.fullName ? review.fullName.charAt(0).toUpperCase() : review.buyerId}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">{review.fullName || `Người dùng #${review.buyerId}`}</p>
                          <div className="flex text-yellow-400 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`size-3 ${i < review.ratingStar ? 'fill-yellow-400' : ''}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gần đây</span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-6">{review.comment}</p>
                    {review.evidence && (
                      <div className="mb-6 rounded-xl overflow-hidden border border-gray-200 w-32 aspect-square">
                        <img src={review.evidence} alt="Bằng chứng" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {review.replyFromShop && (
                      <div className="bg-white p-6 rounded-2xl border border-primary/10 relative">
                        <div className="absolute -top-3 left-6 bg-primary text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">Phản hồi từ Nhà vườn</div>
                        <p className="text-gray-600 text-sm italic">{review.replyFromShop}</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                <Star className="size-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Chưa có đánh giá nào cho sản phẩm này</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {shopCombos.filter(combo => combo.items?.some(item => item.productId === Number(productId))).length > 0 && (
      <div className="max-w-7xl mx-auto px-4 mt-32">
        <h2 className="text-2xl font-black font-display text-gray-900 uppercase mb-12 flex items-center gap-4">
          Combo nấu ăn từ shop này <span className="h-px bg-gray-200 flex-1"></span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {shopCombos
            .filter(combo => combo.items?.some(item => item.productId === Number(productId)))
            .map((combo) => (
              <div key={combo.id} onClick={() => navigate(`/combo/${combo.id}`)} className="group cursor-pointer bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="aspect-[4/3] bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center relative overflow-hidden">
                  {combo.imageUrl
                    ? <img src={combo.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={combo.comboName} />
                    : <ChefHat className="size-12 text-green-200" />}
                  {combo.region && (
                    <span className="absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-white/80 text-gray-600">
                      {combo.region === 'MIEN_BAC' ? '🌿 Bắc' : combo.region === 'MIEN_TRUNG' ? '🌶 Trung' : '🥥 Nam'}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-extrabold text-gray-900 text-sm mb-1 line-clamp-1">{combo.comboName}</h4>
                  <p className="text-xs text-gray-400 mb-2">{combo.items?.length || 0} nguyên liệu</p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary font-black text-lg">{(combo.discountPrice || 0).toLocaleString('vi-VN')}đ</span>
                    <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full uppercase">Chọn combo</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    )}
  </div>
);
};

export default ProductDetail;
