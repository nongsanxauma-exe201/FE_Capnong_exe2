
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  ShoppingCart,
  ChevronRight,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  MessageSquare,
  ChevronLeft,
  X,
  ZoomIn,
  Share2,
  Copy,
  Check,
  Facebook,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  Package,
  ShieldCheck,
  Truck,
  Leaf,
  MapPin,
  Store,
} from 'lucide-react';
import { productService, ProductResponse, ProductImageResponse, cartService, reviewService, ReviewResponse } from '../../services';
import { userService } from '../../services';
import { UserResponse } from '../../services/auth.service';
import { globalShowAlert } from '../../contexts/PopupContext';
import ShopProducts from './ShopProducts';
import { useAuth } from '../../contexts/AuthContext';

// ── Cloudinary URL helper ────────────────────────────────────────────────────
function clImg(url: string | undefined, mode: 'main' | 'thumb' = 'main'): string {
  if (!url || !url.includes('res.cloudinary.com')) return url ?? '';
  const transform = mode === 'main'
    ? 'f_auto,q_auto:best,e_sharpen:60'
    : 'f_auto,q_auto:eco,c_fill,w_150,h_150,g_center';
  return url.replace('/upload/', `/upload/${transform}/`);
}

// ── Image Gallery Component ───────────────────────────────────────────────────
interface ImageGalleryProps {
  images: ProductImageResponse[];
  productName: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, productName }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const sorted = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return a.displayOrder - b.displayOrder;
  });

  const prev = useCallback(() => setActiveIdx(i => (i - 1 + sorted.length) % sorted.length), [sorted.length]);
  const next = useCallback(() => setActiveIdx(i => (i + 1) % sorted.length), [sorted.length]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, prev, next]);

  if (!sorted.length) return null;

  return (
    <>
      {/* Main image */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm group cursor-zoom-in bg-gray-50" onClick={() => setLightbox(true)}>
          <img
            src={clImg(sorted[activeIdx]?.imageUrl, 'main')}
            className="w-full h-full object-contain"
            alt={`${productName} - ảnh ${activeIdx + 1}`}
          />
          <div className="absolute inset-0 bg-transparent group-hover:bg-black/8 transition-colors duration-200 flex items-center justify-center">
            <ZoomIn className="size-8 text-white opacity-0 group-hover:opacity-80 transition-opacity duration-200 drop-shadow-lg" />
          </div>
          {sorted.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 size-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all">
                <ChevronLeft className="size-5 text-gray-700" />
              </button>
              <button onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-9 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all">
                <ChevronRight className="size-5 text-gray-700" />
              </button>
              <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {activeIdx + 1}/{sorted.length}
              </span>
            </>
          )}
        </div>

        {/* Thumbnail row */}
        {sorted.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sorted.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveIdx(idx)}
                className={`flex-shrink-0 size-16 rounded-xl overflow-hidden border-2 transition-all ${
                  idx === activeIdx ? 'border-primary shadow-md scale-105' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img src={clImg(img.imageUrl, 'thumb')} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 size-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
            <X className="size-5 text-white" />
          </button>
          {sorted.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 size-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
                <ChevronLeft className="size-6 text-white" />
              </button>
              <button onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 size-12 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
                <ChevronRight className="size-6 text-white" />
              </button>
            </>
          )}
          <img
            src={clImg(sorted[activeIdx]?.imageUrl, 'main')}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
            alt={productName}
            onClick={e => e.stopPropagation()}
          />
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-bold">
            {activeIdx + 1} / {sorted.length}
          </span>
        </div>
      )}
    </>
  );
};

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
  const [showShareMenu,     setShowShareMenu]     = useState(false);
  const [showShopShareMenu, setShowShopShareMenu] = useState(false);
  const [copied,            setCopied]            = useState(false);
  const [reactingReviewId,  setReactingReviewId]  = useState<number | null>(null);
  const [shopCopied,        setShopCopied]        = useState(false);
  const detailSectionRef = useRef<HTMLDivElement>(null);

  const scrollToProductDetail = () => {
    setActiveTab('Mô tả chi tiết');
    window.setTimeout(() => {
      detailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

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

    // Load gallery images for this product
    try {
      const imgRes = await productService.getImages(idNum);
      if (imgRes.result && imgRes.result.length > 0) {
        setProduct({ ...foundProduct, images: imgRes.result });
      } else {
        setProduct(foundProduct);
      }
    } catch {
      setProduct(foundProduct);
    }

    setRelatedProducts(
      (() => {
        const shopId = foundProduct.shopOwnerId || foundProduct.shopId;
        const sameShop = buyerProducts.filter(
          (p) => p.id !== idNum && (p.shopOwnerId === shopId || p.shopId === shopId),
        );
        const pool = sameShop.length >= 2
          ? sameShop
          : buyerProducts.filter((p) => p.id !== idNum);
        return pool.slice(0, 4);
      })(),
    );

    const shopId = foundProduct.shopOwnerId || foundProduct.shopId;

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
      const res = await reviewService.getByProductId(product.id);
      setReviews(res.result ?? []);
    } catch {
      setReviews([]);
    } finally {
      setIsReviewsLoading(false);
    }
  };

  if (product?.id) fetchReviews();
}, [product?.id]);

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

// Fetch shop owner info for real avatar and join date (only when authenticated, endpoint requires auth)
useEffect(() => {
  const fetchShopOwner = async () => {
    const ownerId = product?.shopOwnerId || product?.shopId;
    if (!ownerId || !isAuthenticated) return;
    try {
      const res = await userService.getUserById(ownerId);
      if (res.result) setShopOwner(res.result);
    } catch (err) {
      console.error('Failed to fetch shop owner info:', err);
    }
  };
  if (product) fetchShopOwner();
}, [product?.shopOwnerId, product?.shopId, isAuthenticated]);

// OG tags cho social sharing (Telegram, Zalo, Discord)
useEffect(() => {
  const DEFAULT_TITLE = 'XẤU MÃ - Nông Sản Mộc Mạc, Giá Trị Thật';
  const DEFAULT_DESC  = 'Nền tảng nông sản sạch, tươi ngon, giao hàng tận nhà.';
  const DEFAULT_IMG   = 'https://nongsanxauma.vn/logo.png';

  const setMeta = (property: string, content: string) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  if (product) {
    const shop = product.shopName || `Cửa hàng #${product.shopId}`;
    const price = product.salePrice ?? product.pricePerKg ?? product.sellingPrice ?? 0;
    const priceStr = price.toLocaleString('vi-VN') + 'đ';
    const desc = `${priceStr}/kg tại ${shop} · ${product.description?.slice(0, 80) || 'Nông sản sạch, tươi ngon'}`;

    document.title = `${product.productName} - ${shop} | Nông Sản Xấu Mã`;
    setMeta('og:title',       `${product.productName} - ${shop}`);
    setMeta('og:description', desc);
    setMeta('og:image',       product.imageUrl || DEFAULT_IMG);
    setMeta('og:url',         window.location.href);
    setMeta('og:type',        'product');
    setMeta('og:site_name',   'Nông Sản Xấu Mã');
  }

  return () => {
    document.title = DEFAULT_TITLE;
    setMeta('og:title',       DEFAULT_TITLE);
    setMeta('og:description', DEFAULT_DESC);
    setMeta('og:image',       DEFAULT_IMG);
    setMeta('og:url',         'https://nongsanxauma.vn');
    setMeta('og:type',        'website');
    setMeta('og:site_name',   'Nông Sản Xấu Mã');
  };
}, [product]);

const handleReact = async (reviewId: number, reactionType: 'LIKE' | 'DISLIKE') => {
  if (!isAuthenticated) { navigate('/login'); return; }
  if (reactingReviewId === reviewId) return;
  try {
    setReactingReviewId(reviewId);
    const res = await reviewService.reactToReview(reviewId, reactionType);
    if (res.result) {
      setReviews(prev => prev.map(r => r.id === reviewId ? res.result! : r));
    }
  } catch { /* silent */ } finally {
    setReactingReviewId(null);
  }
};

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
const stockKg = product.stockKg ?? product.stockQuantity ?? 0;
const basePricePerKg = product.pricePerKg ?? product.sellingPrice ?? 0;
const isOutOfStock = stockKg <= 0;

const productUrl = `${window.location.origin}/san-pham/${product.id}`;
const shopUrl = product.shopId ? `${window.location.origin}/cua-hang/${product.shopId}` : null;

const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const handleShare = async (type: 'product' | 'shop') => {
  const url = type === 'shop' && shopUrl ? shopUrl : productUrl;
  const title = type === 'shop' ? `Cửa hàng ${farmName} trên Nông Sản Xấu Mã` : `${product.productName} - ${farmName}`;
  const text = type === 'shop'
    ? `Xem cửa hàng ${farmName} trên Nông Sản Xấu Mã - nông sản sạch tươi mới mỗi ngày!`
    : `${product.productName}${product.salePrice ? ` chỉ còn ${product.salePrice.toLocaleString('vi-VN')}đ/kg` : ` - ${basePricePerKg.toLocaleString('vi-VN')}đ/kg`} tại ${farmName} trên Nông Sản Xấu Mã!`;
  if (isMobileBrowser && navigator.share) {
    try { await navigator.share({ title, text, url }); return; } catch { /* user cancelled */ }
  }
  setShowShareMenu(true);
};

const copyLink = async (type: 'product' | 'shop') => {
  const url = type === 'shop' && shopUrl ? shopUrl : productUrl;
  await navigator.clipboard.writeText(url);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

const shareToFacebook = (type: 'product' | 'shop') => {
  const url = encodeURIComponent(type === 'shop' && shopUrl ? shopUrl : productUrl);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
};

const shareToZalo = (type: 'product' | 'shop') => {
  const rawUrl = type === 'shop' && shopUrl ? shopUrl : productUrl;
  const url = encodeURIComponent(rawUrl);
  // Trên mobile: dùng deep link mở thẳng app Zalo (không cần đăng ký SDK)
  // Trên desktop: Zalo web share yêu cầu đăng ký tại developers.zalo.me — fallback copy link
  if (isMobileBrowser) {
    window.location.href = `zalo://share?url=${url}`;
  } else {
    navigator.clipboard.writeText(rawUrl);
    alert('Đã sao chép link! Mở Zalo và dán vào hội thoại để chia sẻ.');
  }
};

const shareToMessenger = (type: 'product' | 'shop') => {
  const rawUrl = type === 'shop' && shopUrl ? shopUrl : productUrl;
  const url = encodeURIComponent(rawUrl);
  if (isMobileBrowser) {
    // Deep link mở Messenger app trên mobile
    window.location.href = `fb-messenger://share?link=${url}`;
  } else {
    window.open(`https://www.facebook.com/dialog/send?link=${url}&app_id=&redirect_uri=${url}`, '_blank', 'width=600,height=400');
  }
};

const hasActiveDiscount = product.salePrice != null && product.salePrice > 0;
const displayPrice = hasActiveDiscount ? product.salePrice! : basePricePerKg;
const productAvgRating = reviews.length > 0
  ? reviews.reduce((acc, r) => acc + r.ratingStar, 0) / reviews.length
  : 0;
const shopAvgRating = shopReviews.length > 0
  ? shopReviews.reduce((acc, r) => acc + r.ratingStar, 0) / shopReviews.length
  : 0;
const minOrderKg = product.minOrderKg ?? 1;
const highlights = [
  { icon: Leaf, label: 'Thu hoạch tươi', sub: 'Giao trong ngày' },
  { icon: MapPin, label: 'Nguồn gốc rõ', sub: farmName },
  { icon: Package, label: 'Đóng gói cẩn thận', sub: 'Giữ độ tươi' },
  { icon: ShieldCheck, label: 'Shop uy tín', sub: shopReviews.length > 0 ? `${shopAvgRating.toFixed(1)}★ cửa hàng` : 'Đã xác minh' },
];

const handleAddToCart = async () => {
  if (!isAuthenticated) { navigate('/login'); return; }
  try {
    setIsAdding(true);
    await cartService.addToCart({ productId: Number(productId), quantity, quantityKg: quantity });
    window.dispatchEvent(new Event('cart-updated'));
    globalShowAlert(`Đã thêm ${quantity} kg ${product.productName} vào giỏ hàng`, 'Thành công', 'success');
  } catch (e) {
    console.error('Failed to add to cart', e);
    globalShowAlert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.', 'Lỗi', 'error');
  } finally {
    setIsAdding(false);
  }
};

return (
  <div className="flex-1 bg-[#fdfcf7] pb-20">
    {/* Sticky top bar */}
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-sm text-gray-500 min-w-0">
          <button type="button" onClick={handleBack} className="shrink-0 size-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
            <ChevronLeft className="size-5" />
          </button>
          <span className="cursor-pointer hover:text-primary truncate hidden sm:inline" onClick={handleBack}>Trang chủ</span>
          <ChevronRight className="size-4 shrink-0 hidden sm:block" />
          <span className="text-gray-900 font-semibold truncate">{product.productName}</span>
        </nav>
        <div className="relative shrink-0">
          <button
            onClick={() => handleShare('product')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-all border border-gray-200"
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Chia sẻ</span>
          </button>
        {showShareMenu && (
          <div className="absolute right-0 top-12 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-gray-700 uppercase tracking-widest">Chia sẻ sản phẩm</p>
              <button onClick={() => setShowShareMenu(false)} className="size-6 flex items-center justify-center hover:bg-gray-100 rounded-lg"><X className="size-3.5 text-gray-400" /></button>
            </div>
            <div className="space-y-2">
              <button onClick={() => { copyLink('product'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors">
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4 text-gray-400" />}
                {copied ? 'Đã sao chép!' : 'Sao chép link sản phẩm'}
              </button>
              <button onClick={() => shareToFacebook('product')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-sm font-bold text-blue-600 transition-colors">
                <Facebook className="size-4" /> Chia sẻ Facebook
              </button>
              <button onClick={() => shareToZalo('product')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-sm font-bold text-blue-500 transition-colors">
                <span className="size-4 rounded-full bg-blue-500 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0">Z</span>
                Chia sẻ Zalo
              </button>
              <button onClick={() => shareToMessenger('product')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 text-sm font-bold text-indigo-600 transition-colors">
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.913 1.405 5.514 3.608 7.24V22l3.259-1.793c.872.242 1.795.372 2.748.372 5.523 0 10-4.145 10-9.336C21.615 6.145 17.523 2 12 2zm1.067 12.573l-2.545-2.715-4.965 2.715 5.463-5.8 2.609 2.715 4.9-2.715-5.462 5.8z"/></svg>
                Chia sẻ Messenger
              </button>
              {shopUrl && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Chia sẻ cửa hàng</p>
                  <button onClick={() => { copyLink('shop'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors">
                    {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4 text-gray-400" />}
                    Sao chép link cửa hàng
                  </button>
                  <button onClick={() => shareToFacebook('shop')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-sm font-bold text-blue-600 transition-colors">
                    <Facebook className="size-4" /> Facebook (Cửa hàng)
                  </button>
                  <button onClick={() => shareToZalo('shop')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-sm font-bold text-blue-500 transition-colors">
                    <span className="size-4 rounded-full bg-blue-500 text-white text-[8px] font-black flex items-center justify-center flex-shrink-0">Z</span>
                    Zalo (Cửa hàng)
                  </button>
                  <button onClick={() => shareToMessenger('shop')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 text-sm font-bold text-indigo-600 transition-colors">
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.913 1.405 5.514 3.608 7.24V22l3.259-1.793c.872.242 1.795.372 2.748.372 5.523 0 10-4.145 10-9.336C21.615 6.145 17.523 2 12 2zm1.067 12.573l-2.545-2.715-4.965 2.715 5.463-5.8 2.609 2.715 4.9-2.715-5.462 5.8z"/></svg>
                    Messenger (Cửa hàng)
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>

    {/* Hero product card */}
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 lg:p-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex flex-col">
            {product.images && product.images.length > 0 ? (
              <ImageGallery images={product.images} productName={product.productName} />
            ) : (
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                <img src={product.imageUrl || 'https://picsum.photos/seed/product/400/400'} className="w-full h-full object-cover" alt={product.productName} />
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {isOutOfStock ? (
                <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full border border-red-100">Hết hàng</span>
              ) : (
                <>
                  <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">Tươi mới</span>
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-100">
                    Còn {stockKg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg
                  </span>
                </>
              )}
              {product.expiryDate && (
                <span className="bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
                  HSD: {new Date(product.expiryDate).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <button
                type="button"
                onClick={() => { if (product.shopId) { setViewShopMode(true); setSelectedShopId(product.shopId); } }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-full px-3 py-1 mb-3 transition-colors"
              >
                <Store className="size-3.5" />
                {farmName}
              </button>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-gray-900 leading-tight">{product.productName}</h1>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`size-4 ${i < Math.round(productAvgRating) ? 'fill-yellow-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <span className="text-gray-500 text-sm font-medium">
                  {reviews.length > 0 ? `${productAvgRating.toFixed(1)} · ${reviews.length} đánh giá` : 'Chưa có đánh giá'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-emerald-50/50 border border-primary/10 p-5">
              {hasActiveDiscount ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400 text-base line-through font-medium">{basePricePerKg.toLocaleString('vi-VN')}đ/kg</span>
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">-{product.discountPercent}%</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-primary font-black text-3xl sm:text-4xl">{displayPrice.toLocaleString('vi-VN')}đ</span>
                    <span className="text-gray-500 font-semibold text-sm">/ kg</span>
                  </div>
                  <p className="text-xs text-primary font-semibold">
                    Tiết kiệm {(basePricePerKg - product.salePrice!).toLocaleString('vi-VN')}đ/kg
                    {product.discountEndDate && ` · đến ${new Date(product.discountEndDate).toLocaleDateString('vi-VN')}`}
                  </p>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-primary font-black text-3xl sm:text-4xl">{displayPrice.toLocaleString('vi-VN')}đ</span>
                  <span className="text-gray-500 font-semibold text-sm">/ kg</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-primary/10">
                <div className="text-center">
                  <p className="text-lg font-black text-gray-900">{stockKg.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Kg tồn kho</p>
                </div>
                <div className="text-center border-l border-primary/10">
                  <p className="text-lg font-black text-gray-900">{minOrderKg}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Kg tối thiểu</p>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
              {product.description || 'Sản phẩm sạch được thu hoạch ngay tại vườn, đảm bảo độ tươi ngon khi đến tay bạn.'}
            </p>
            <button
              type="button"
              onClick={scrollToProductDetail}
              className="self-start text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Xem mô tả đầy đủ
              <ChevronDown className="size-4" />
            </button>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden h-14">
                <button disabled={isOutOfStock} onClick={() => setQuantity(Math.max(minOrderKg, quantity - 1))} className="w-12 h-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-50"><Minus className="size-4" /></button>
                <input type="text" value={isOutOfStock ? '0 kg' : `${quantity} kg`} readOnly className="w-16 text-center font-black bg-transparent outline-none text-gray-800" />
                <button disabled={isOutOfStock || quantity >= stockKg} onClick={() => setQuantity(quantity + 1)} className="w-12 h-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 disabled:opacity-50"><Plus className="size-4" /></button>
              </div>
              <button
                disabled={isOutOfStock || isAdding}
                onClick={handleAddToCart}
                className="flex-1 bg-primary text-white h-14 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                {isAdding ? <Loader2 className="size-5 animate-spin" /> : <ShoppingCart className="size-5" />}
                {isAdding ? 'Đang thêm...' : (isOutOfStock ? 'Hết hàng' : 'Thêm vào giỏ')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trust highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {highlights.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 mb-12">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          <div className="flex items-start gap-5">
            <div className="size-24 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0 border-4 border-white">
              <img src={shopOwner?.logoUrl || `https://picsum.photos/seed/shop${product.shopOwnerId}/100/100`} alt={farmName} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 pt-1">
              <h4 className="font-black text-gray-900 text-lg mb-1">{farmName}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  onClick={() => { if (product.shopId) { setViewShopMode(true); setSelectedShopId(product.shopId); } }}
                  className="inline-flex items-center justify-center gap-1.5 h-10 min-w-[8.5rem] px-4 bg-white text-primary font-black text-[10px] uppercase tracking-widest rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm whitespace-nowrap"
                >
                  <Store className="size-3.5 shrink-0" />
                  Xem cửa hàng
                </button>
                <button
                  onClick={() => {
                    if (!isAuthenticated) { navigate('/login'); return; }
                    if (product.shopId) {
                      window.dispatchEvent(new CustomEvent('open-chat-with-user', {
                        detail: { userId: product.shopId, userName: product.shopName || 'Chủ shop' }
                      }));
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 h-10 min-w-[8.5rem] px-4 bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-blue-100 hover:bg-blue-500 hover:text-white transition-all shadow-sm whitespace-nowrap"
                >
                  <MessageSquare className="size-3.5 shrink-0" />
                  Chat shop
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowShopShareMenu(v => !v)}
                    className="inline-flex items-center justify-center gap-1.5 h-10 min-w-[8.5rem] px-4 bg-gray-50 text-gray-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-gray-200 hover:bg-gray-100 transition-all shadow-sm whitespace-nowrap"
                  >
                    <Share2 className="size-3.5 shrink-0" />
                    Chia sẻ
                  </button>
                  {showShopShareMenu && shopUrl && (
                    <div className="absolute left-0 top-12 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-56 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Chia sẻ cửa hàng</p>
                        <button onClick={() => setShowShopShareMenu(false)} className="size-5 flex items-center justify-center hover:bg-gray-100 rounded-lg">
                          <X className="size-3 text-gray-400" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <button onClick={async () => { await navigator.clipboard.writeText(shopUrl); setShopCopied(true); setTimeout(() => setShopCopied(false), 2000); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors">
                          {shopCopied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5 text-gray-400" />}
                          {shopCopied ? 'Đã sao chép!' : 'Sao chép link cửa hàng'}
                        </button>
                        <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopUrl)}`, '_blank', 'width=600,height=400'); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-xs font-bold text-blue-600 transition-colors">
                          <Facebook className="size-3.5" /> Chia sẻ Facebook
                        </button>
                        <button onClick={() => shareToZalo('shop')}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-xs font-bold text-blue-500 transition-colors">
                          <span className="size-3.5 rounded-full bg-blue-500 text-white text-[7px] font-black flex items-center justify-center flex-shrink-0">Z</span>
                          Chia sẻ Zalo
                        </button>
                        <button onClick={() => shareToMessenger('shop')}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-xs font-bold text-indigo-600 transition-colors">
                          <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.913 1.405 5.514 3.608 7.24V22l3.259-1.793c.872.242 1.795.372 2.748.372 5.523 0 10-4.145 10-9.336C21.615 6.145 17.523 2 12 2zm1.067 12.573l-2.545-2.715-4.965 2.715 5.463-5.8 2.609 2.715 4.9-2.715-5.462 5.8z"/></svg>
                          Chia sẻ Messenger
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

    <div ref={detailSectionRef} id="product-detail-section" className="max-w-7xl mx-auto px-4 mb-12 scroll-mt-24">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {['Mô tả chi tiết', 'Chứng nhận', 'Đánh giá'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[120px] px-4 py-4 text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
              {tab === 'Đánh giá' && reviews.length > 0 && (
                <span className="ml-1.5 text-xs font-semibold text-gray-400">({reviews.length})</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-6 lg:p-8">
        {activeTab === 'Mô tả chi tiết' && (
          <div className="max-w-3xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Thông tin sản phẩm</h3>
            <div className="text-gray-600 text-sm leading-loose whitespace-pre-wrap bg-gray-50 p-6 rounded-2xl border border-gray-100">
              {product.description || 'Nông sản sạch tận vườn, được thu hoạch và đóng gói cẩn thận trước khi giao đến bạn.'}
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Đơn vị</p>
                <p className="font-bold text-gray-900">{product.unit || 'kg'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Cửa hàng</p>
                <p className="font-bold text-gray-900">{farmName}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Chứng nhận' && (
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
            {[
              { icon: ShieldCheck, title: 'Shop trên nền tảng', desc: 'Cửa hàng đã đăng ký và hoạt động trên Nông Sản Xấu Mã.' },
              { icon: Leaf, title: 'Nguồn gốc minh bạch', desc: 'Thông tin shop và sản phẩm được hiển thị công khai cho người mua.' },
              { icon: Truck, title: 'Giao hàng tận nơi', desc: 'Đơn hàng được xử lý và giao qua hệ thống vận chuyển đối tác.' },
              { icon: Package, title: 'Đóng gói chuẩn', desc: 'Nông sản được bảo quản và đóng gói cẩn thận trong quá trình vận chuyển.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
                <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Đánh giá' && (
          <div className="space-y-8">
            {isReviewsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => {
                const isLiked    = review.currentUserReaction === 'LIKE';
                const isDisliked = review.currentUserReaction === 'DISLIKE';
                const isReacting = reactingReviewId === review.id;
                return (
                  <div key={review.id} className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {review.fullName ? review.fullName.charAt(0).toUpperCase() : review.buyerId}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">{review.fullName || `Người dùng #${review.buyerId}`}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {review.createAt ? new Date(review.createAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                          </p>
                          <div className="flex text-yellow-400 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`size-3 ${i < review.ratingStar ? 'fill-yellow-400' : ''}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Hữu ích?</span>
                        <button
                          onClick={() => handleReact(review.id, 'LIKE')}
                          disabled={isReacting}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                            isLiked
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-green-400 hover:text-green-600'
                          } disabled:opacity-50`}
                        >
                          <ThumbsUp className="size-3" />
                          ({review.likeCount ?? 0})
                        </button>
                        <button
                          onClick={() => handleReact(review.id, 'DISLIKE')}
                          disabled={isReacting}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                            isDisliked
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-500'
                          } disabled:opacity-50`}
                        >
                          <ThumbsDown className="size-3" />
                          ({review.dislikeCount ?? 0})
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{review.comment}</p>
                    {review.evidence && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 w-32 aspect-square">
                        <img src={review.evidence} alt="Bằng chứng" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {review.replyFromShop && (
                      <div className="bg-white p-6 rounded-2xl border border-primary/10 relative mb-4">
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
    </div>

    {relatedProducts.length > 0 && (
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">Sản phẩm liên quan</h2>
          {product.shopId && (
            <button
              type="button"
              onClick={() => { setViewShopMode(true); setSelectedShopId(product.shopId!); }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Xem tất cả tại {farmName}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {relatedProducts.map((rp) => {
            const rpPrice = rp.salePrice ?? rp.pricePerKg ?? rp.sellingPrice ?? 0;
            const rpStock = rp.stockKg ?? rp.stockQuantity ?? 0;
            return (
              <button
                key={rp.id}
                type="button"
                onClick={() => navigate(`/san-pham/${rp.id}`)}
                className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all overflow-hidden group"
              >
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  <img
                    src={clImg(rp.imageUrl, 'thumb') || rp.imageUrl}
                    alt={rp.productName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3">
                  <p className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug mb-1">{rp.productName}</p>
                  <p className="text-primary font-black text-base">{rpPrice.toLocaleString('vi-VN')}đ<span className="text-gray-400 font-medium text-xs">/kg</span></p>
                  <p className="text-[10px] text-gray-400 mt-1">{rpStock > 0 ? `Còn ${rpStock} kg` : 'Hết hàng'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    )}

    {shopCombos.filter(combo => combo.items?.some(item => item.productId === Number(productId))).length > 0 && (
      <div className="max-w-7xl mx-auto px-4 mb-12">
        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
          <ChefHat className="size-6 text-primary" />
          Combo nấu ăn từ shop này
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
