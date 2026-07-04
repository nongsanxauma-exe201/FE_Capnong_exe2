import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  ChevronRight,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  Package,
  Award,
  Zap,
  MapPin,
  Gift,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { mysteryBoxService, MysteryBox, cartService, reviewService, ReviewResponse } from '../../services';
import { globalShowAlert } from '../../contexts/PopupContext';
import { useAuth } from '../../contexts/AuthContext';
import ShopProducts from '../Product/ShopProducts';

interface MysteryBoxDetailProps {
  boxId?: string;
  onBack?: () => void;
}

const MysteryBoxDetail: React.FC<MysteryBoxDetailProps> = ({
  boxId: propBoxId,
  onBack: propOnBack,
}) => {
  const { boxId: urlBoxId } = useParams<{ boxId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const boxId = propBoxId || urlBoxId || '';

  const [box, setBox] = useState<MysteryBox | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [viewShopMode, setViewShopMode] = useState(false);
  const [reactingReviewId, setReactingReviewId] = useState<number | null>(null);

  const handleBack = () => {
    if (propOnBack) propOnBack();
    else navigate('/');
  };

  useEffect(() => {
    const fetchBox = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await mysteryBoxService.getById(Number(boxId));
        if (res.result) {
          setBox(res.result);
        } else {
          setError('Không tìm thấy túi mù.');
        }
      } catch (err) {
        console.error('Failed to fetch mystery box:', err);
        setError('Không thể tải thông tin túi mù. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    if (boxId) fetchBox();
  }, [boxId]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!box?.id) return;
      try {
        const res = await reviewService.getByMysteryBoxId(box.id);
        setReviews(res.result ?? []);
      } catch {
        setReviews([]);
      }
    };
    fetchReviews();
  }, [box?.id, box?.shopOwnerId]);

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

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setIsAdding(true);
      // Dùng chung cartService, truyền mysteryBoxId thay productId
      await cartService.addToCart({ mysteryBoxId: Number(boxId), quantity });
      window.dispatchEvent(new Event('cart-updated'));
      globalShowAlert(`Đã thêm ${quantity} túi mù "${box?.boxType}" vào giỏ hàng`, 'Thành công', 'success');
    } catch (e) {
      console.error('Failed to add mystery box to cart', e);
      globalShowAlert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.', 'Lỗi', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  if (viewShopMode && box?.shopOwnerId) {
    return <ShopProducts shopId={box.shopOwnerId} onBack={() => setViewShopMode(false)} isAuthenticated={isAuthenticated} onOpenLogin={() => navigate('/login')} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4 w-full">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
          Đang tải thông tin túi mù...
        </p>
      </div>
    );
  }

  if (error || !box) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4 w-full px-4">
        <div className="bg-red-50 border border-red-100 p-8 rounded-3xl flex flex-col items-center gap-4 text-red-600 font-bold max-w-lg text-center">
          <AlertCircle className="size-10" />
          <p>{error || 'Túi mù không khả dụng'}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-white text-red-600 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white pb-20">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between border-b border-gray-100 mb-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <span className="cursor-pointer hover:text-primary" onClick={handleBack}>
            Trang chủ
          </span>
          <ChevronRight className="size-4" />
          <span
            className="cursor-pointer hover:text-primary"
            onClick={() => { handleBack(); }}
          >
            Túi mù
          </span>
          <ChevronRight className="size-4" />
          <span className="text-gray-900 font-medium">{box.boxType}</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 animate-in fade-in duration-500">
        {/* Image */}
        <div className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
          {box.imageUrl ? (
            <img
              src={box.imageUrl}
              className="w-full h-full object-cover"
              alt={box.boxType}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-green-300">
              <Package className="size-32" />
              <span className="text-6xl font-black text-primary/20">?</span>
            </div>
          )}
          {/* Badge */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
            <Award className="size-4 text-green-600" />
            <span className="text-[10px] font-black uppercase tracking-widest">Cam kết sạch</span>
          </div>
          {/* Mystery overlay hint */}
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white px-4 py-2 rounded-xl flex items-center gap-2">
            <Gift className="size-4 text-yellow-400" />
            <span className="text-[11px] font-black uppercase tracking-widest">Nội dung bí ẩn</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Danh mục: Túi mù nông sản
              </span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                ID: {box.id}
              </span>
            </div>
            <h1 className="text-3xl font-black font-display text-gray-800 mb-2 leading-tight">
              {box.boxType}
            </h1>
            {/* Savings badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full mt-2">
              <Zap className="size-3.5 fill-current" />
              <span className="text-[11px] font-black uppercase tracking-widest">
                Tiết kiệm 50% so với mua lẻ
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-3">
              <span className="text-primary font-black text-4xl">
                {box.price.toLocaleString('vi-VN')}đ
              </span>
              <span className="text-gray-400 font-bold uppercase text-xs mt-2">/ túi</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">
            {box.description || 'Hộp quà nông sản bí ẩn từ nông trại đối tác. Mỗi túi chứa đựng những loại củ quả tươi sạch được chọn lọc kỹ càng.'}
          </p>

          {/* Note */}
          {box.note && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-yellow-800 font-medium">
              <span className="font-black uppercase text-[10px] tracking-widest text-yellow-600 block mb-1">Ghi chú</span>
              {box.note}
            </div>
          )}

          {/* Farm info */}
          <div className="flex items-center gap-2 text-gray-400 text-sm font-bold">
            <MapPin className="size-4" />
            <span>Nông trại đối tác #{box.shopOwnerId}</span>
          </div>          {/* Quantity + Add to cart */}
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">
              Số lượng
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden h-14">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="text"
                value={quantity}
                readOnly
                className="w-12 text-center font-black bg-transparent outline-none text-gray-800"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <button
              disabled={isAdding}
              onClick={handleAddToCart}
              className="flex-1 bg-primary text-white h-14 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-3 disabled:bg-gray-300 disabled:text-gray-500 hover:-translate-y-1 transform disabled:transform-none"
            >
              {isAdding ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ShoppingCart className="size-5" />
              )}
              {isAdding ? 'Đang thêm...' : 'Thêm vào giỏ'}
            </button>
          </div>

          {/* Mystery content hint */}
          <div className="mt-4 bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-6">
            <h4 className="font-black text-gray-800 text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gift className="size-4 text-primary" /> Túi mù gồm những gì?
            </h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Nội dung túi mù được giữ bí mật để tạo bất ngờ! Bạn sẽ nhận được các loại củ quả tươi sạch theo mùa, được chọn lọc kỹ từ nông trại đối tác đã được chứng nhận.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {['100% Tươi sạch', 'Theo mùa vụ', 'Đủ cho 2-4 người'].map((tag) => (
                <div key={tag} className="bg-white rounded-xl border border-green-100 p-3 text-center">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Shop Info Section */}
      <div className="max-w-7xl mx-auto px-4 mb-20">
        <div className="bg-gradient-to-br from-green-50 to-white rounded-[32px] border border-green-100 shadow-sm p-10 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            <div className="flex items-start gap-5">
              <div className="size-24 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0 border-4 border-white">
                <img src={`https://picsum.photos/seed/shop${box.shopOwnerId}/100/100`} alt="Shop" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="font-black text-gray-900 text-lg mb-1">Nông trại đối tác #{box.shopOwnerId}</h4>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { if (box.shopOwnerId) { setViewShopMode(true); } }}
                    className="px-5 py-2.5 bg-white text-primary font-black text-[10px] uppercase tracking-widest rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    Xem Cửa Hàng
                  </button>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) { navigate('/login'); return; }
                      window.dispatchEvent(new CustomEvent('open-chat-with-user', {
                        detail: { userId: box.shopOwnerId, userName: 'Chủ shop' }
                      }));
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
                    {reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.ratingStar, 0) / reviews.length).toFixed(1) : '—'}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Đánh Giá ({reviews.length})</p>
                </div>
                <div className="text-center border-l border-r border-gray-100 px-4">
                  <p className="text-2xl font-black text-gray-900 mb-1">98%</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tỉ Lệ Phản Hồi</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900 mb-1">3 Năm</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tham Gia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-20">
          <h2 className="text-2xl font-black text-gray-900 uppercase mb-8 flex items-center gap-4">
            Đánh giá túi mù ({reviews.length}) <span className="h-px bg-gray-200 flex-1"></span>
          </h2>
          <div className="space-y-6">
            {reviews.map((review) => {
              const isLiked    = review.currentUserReaction === 'LIKE';
              const isDisliked = review.currentUserReaction === 'DISLIKE';
              const isReacting = reactingReviewId === review.id;
              return (
                <div key={review.id} className="bg-gray-50 p-8 rounded-[32px] border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {review.fullName ? review.fullName.charAt(0).toUpperCase() : 'U'}
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
                    <div className="mt-4 mb-4 bg-white p-5 rounded-2xl border border-primary/10 relative">
                      <div className="absolute -top-3 left-6 bg-primary text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Phản hồi từ Nhà vườn</div>
                      <p className="text-gray-600 text-sm italic">{review.replyFromShop}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MysteryBoxDetail;