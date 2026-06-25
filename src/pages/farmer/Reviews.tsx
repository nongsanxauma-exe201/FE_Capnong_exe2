import React, { useState, useEffect } from 'react';
import { Star, Search, MessageSquare, CheckCircle, Clock, AlertCircle, Loader2, Filter, Reply, CornerDownRight } from 'lucide-react';
import { reviewService, productService, authService, ReviewResponse, ProductResponse } from '../../services';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert } from '../../contexts/PopupContext';

const PAGE_SIZE = 10;

const Reviews: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [shopId, setShopId] = useState<number | null>(null);
  
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const userRes = await authService.getMyInfo();
      const id = userRes.result?.id;

      if (id) {
        setShopId(Number(id));
        const [reviewsRes, productsRes] = await Promise.all([
          reviewService.getByShopIdPaged(id, page, PAGE_SIZE).catch(() => ({ result: null })),
          productService.getByShopId(id).catch(() => ({ result: [] }))
        ]);

        if (reviewsRes.result) {
          const sortedReviews = reviewsRes.result.content.sort((a, b) => b.id - a.id);
          setReviews(sortedReviews);
          setPageInfo({
            page: reviewsRes.result.page,
            size: reviewsRes.result.size,
            totalElements: reviewsRes.result.totalElements,
            totalPages: reviewsRes.result.totalPages,
            first: reviewsRes.result.first,
            last: reviewsRes.result.last,
          });
        }
        if (productsRes.result) {
          setProducts(productsRes.result);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Mất kết nối tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleReplySubmit = async (reviewId: number) => {
    if (!replyText.trim()) return;
    
    try {
      setIsSubmitting(true);
      await reviewService.replyReview(reviewId, { replyFromShop: replyText });
      globalShowAlert('Đã gửi phản hồi thành công!', 'Thành công', 'success');
      setReplyingTo(null);
      setReplyText('');
      fetchData();
    } catch (err: any) {
      globalShowAlert(err?.data?.message || 'Có lỗi khi phản hồi đánh giá', 'Lỗi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductInfo = (productId: number) => {
    return products.find(p => p.id === productId);
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, rev) => acc + rev.ratingStar, 0);
    return (sum / reviews.length).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4 w-full">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Đang tải đánh giá...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black font-display text-gray-900">Quản Lý Đánh Giá</h2>
          <p className="text-gray-400 font-medium text-sm mt-1">Lắng nghe và phản hồi trải nghiệm của khách hàng.</p>
        </div>
        <div className="relative">
          <input type="text" placeholder="Tìm tên khách hàng..." className="pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64 shadow-sm" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 size-5" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600 font-bold">
          <AlertCircle className="size-6" />
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div id="tour-reviews-stats" className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div id="tour-reviews-avg-card" className="md:col-span-2 bg-gradient-to-br from-primary to-primary-dark p-8 rounded-[32px] shadow-lg shadow-primary/20 text-white flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary-100 mb-2">Đánh Giá Trung Bình</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-5xl font-black font-display">{calculateAverageRating()}</h3>
              <span className="text-xl text-primary-100 font-bold">/ 5.0</span>
            </div>
            <div className="flex text-yellow-300 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`size-5 ${i < Math.round(Number(calculateAverageRating())) ? 'fill-yellow-300' : 'text-primary-300'}`} />
              ))}
            </div>
          </div>
          <div className="size-24 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
            <MessageSquare className="size-10 text-white" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tổng Lượt Đánh Giá</p>
          <h4 className="text-3xl font-black text-gray-900">{reviews.length}</h4>
          <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-lg w-fit">Từ khách mua hàng</span>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cần Phản Hồi</p>
          <h4 className="text-3xl font-black text-orange-500">{reviews.filter(r => !r.replyFromShop).length}</h4>
          <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase rounded-lg w-fit">Đang chờ xử lý</span>
        </div>
      </div>

      {/* Reviews List */}
      <div id="tour-reviews-list" className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
          <h4 className="font-black text-gray-800 uppercase tracking-tight">Mới Nhất ({reviews.length})</h4>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-100 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50">
            <Filter className="size-4" /> Lọc & Sắp xếp
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {reviews.length === 0 ? (
            <div className="p-16 text-center">
              <div className="size-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="size-10 text-gray-300" />
              </div>
              <p className="text-gray-500 font-bold">Chưa có đánh giá nào cho cửa hàng của bạn.</p>
            </div>
          ) : reviews.map((review) => {
            // Note: Current backend API does not return product context within review directly
            // In a real scenario, review would have productId or we get it from orderDetailId
            // For UI purposes, we'll display a generic structure that fits the data available
            
            const isReplied = !!review.replyFromShop;
            const isReplyingNow = replyingTo === review.id;

            return (
              <div key={review.id} id={reviews.indexOf(review) === 0 ? 'tour-reviews-first-card' : undefined} className="p-8 hover:bg-gray-50/30 transition-colors">
                <div className="flex gap-6">
                  {/* Avatar */}
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20 shrink-0">
                    {review.fullName ? review.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-black text-gray-900 text-sm">{review.fullName || `Khách hàng #${review.buyerId}`}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {review.createAt ? new Date(review.createAt).toLocaleDateString('vi-VN') : 'Gần đây'}
                        </p>
                        <div className="flex text-yellow-400 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`size-3.5 ${i < review.ratingStar ? 'fill-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-lg whitespace-nowrap">
                          {review.productName || review.boxType
                            ? (review.productName ? `SP: ${review.productName}` : `Túi mù: ${review.boxType}`)
                            : `Đơn #${review.orderDetailId}`}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm leading-relaxed mb-4 whitespace-pre-line">{review.comment}</p>
                    
                    {/* Reply Section */}
                    {isReplied ? (
                      <div className="mt-4 p-5 bg-gray-50 rounded-2xl border border-gray-100 ml-4 relative">
                        <CornerDownRight className="absolute -left-6 top-6 size-4 text-gray-300" />
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-6 bg-primary rounded-full flex items-center justify-center text-white">
                            <CheckCircle className="size-3" />
                          </div>
                          <span className="text-xs font-black text-gray-900">Phản hồi của Shop</span>
                        </div>
                        <p className="text-gray-600 text-sm pl-8 italic">{review.replyFromShop}</p>
                      </div>
                    ) : isReplyingNow ? (
                      <div className="mt-4 ml-4 relative animate-in slide-in-from-top-2">
                        <CornerDownRight className="absolute -left-6 top-6 size-4 text-gray-300" />
                        <div className="bg-white border-2 border-primary/20 rounded-2xl p-2 focus-within:border-primary transition-colors pr-2 flex items-end">
                          <textarea
                            autoFocus
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Viết câu trả lời để cảm ơn hoặc giải đáp thắc mắc cho người mua..."
                            className="w-full bg-transparent outline-none p-3 text-sm resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2 p-2 shrink-0">
                            <button 
                              disabled={isSubmitting}
                              onClick={() => { setReplyingTo(null); setReplyText(''); }}
                              className="px-4 py-2 border border-gray-200 text-gray-500 text-xs font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50"
                            >
                              Hủy
                            </button>
                            <button 
                              disabled={isSubmitting || !replyText.trim()}
                              onClick={() => handleReplySubmit(review.id)}
                              className="px-5 py-2 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:bg-gray-300 transition-all flex items-center gap-2"
                            >
                              {isSubmitting ? <Loader2 className="size-3 animate-spin"/> : <Reply className="size-3"/>}
                              Gửi
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 ml-4">
                        <button 
                          onClick={() => setReplyingTo(review.id)}
                          className="flex items-center gap-2 text-primary hover:text-primary-dark text-xs font-black transition-colors"
                        >
                          <Reply className="size-4" /> Trả lời đánh giá này
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {pageInfo && <Pagination pageInfo={pageInfo} onPageChange={setPage} className="mt-4" />}
    </div>
  );
};

export default Reviews;
