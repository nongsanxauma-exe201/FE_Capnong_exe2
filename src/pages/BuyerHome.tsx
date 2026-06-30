import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { normalizeSearch } from '../utils/string';
import { productService, ProductResponse, mysteryBoxService, MysteryBox, reviewService, categoryService, CategoryResponse } from '../services';
import {
  Star,
  MapPin,
  ShoppingCart,
  ArrowRight,
  Zap,
  Award,
  Leaf,
  Utensils,
  Apple,
  LayoutGrid,
  Grape,
  Loader2,
  Package,
  SearchX,
  X,
} from 'lucide-react';

interface BuyerHomeProps {
  onSelectProduct: (id: string) => void;
  isAuthenticated?: boolean;
  onOpenLogin?: () => void;
}

const BuyerHome: React.FC<BuyerHomeProps> = ({ onSelectProduct, isAuthenticated = false, onOpenLogin = () => { } }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [featuredStory, setFeaturedStory] = useState<string>('Đang tải câu chuyện nông sản...');
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [mysteryBoxes, setMysteryBoxes] = useState<MysteryBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBoxes, setIsLoadingBoxes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productRatings, setProductRatings] = useState<Record<number, { average: number; count: number }>>({});
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
    'Củ gia vị': LayoutGrid,
    'Củ thực phẩm': Apple,
    'Trái cây nhiệt đới': Grape,
    'Trái cây quanh năm': Utensils,
  };

  // Get search query from URL
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('search') || '';
  const isSearching = searchQuery.length > 0;

  useEffect(() => {
    // generateProduceStory('Cà chua bi hữu cơ').then(setFeaturedStory);
    setFeaturedStory('Nông sản từ vườn đến bàn ăn, giữ trọn hương vị tự nhiên và tâm huyết của người nông dân.');

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await productService.getForBuyer();

        if (response.result) {
          const buyerProducts = response.result.filter(
            (p) => p?.id && !isNaN(Number(p.id))
          );

          setProducts(buyerProducts);

          const ratingsMap: Record<number, { average: number; count: number }> = {};

          await Promise.all(
            buyerProducts.map(async (product) => {
              try {
                let reviews: any[] = [];

                try {
                  const reviewsRes = await reviewService.getByProductId(product.id);
                  if (reviewsRes?.result && Array.isArray(reviewsRes.result)) {
                    reviews = reviewsRes.result;
                  }
                } catch {
                  if (product.shopOwnerId) {
                    const shopReviewsRes = await reviewService.getByShopId(product.shopOwnerId);
                    if (shopReviewsRes?.result && Array.isArray(shopReviewsRes.result)) {
                      reviews = shopReviewsRes.result.filter((r: any) => r.productId === product.id);
                    }
                  }
                }

                if (reviews.length > 0) {
                  const average = reviews.reduce((sum, r) => sum + r.ratingStar, 0) / reviews.length;
                  ratingsMap[product.id] = { average, count: reviews.length };
                }
              } catch (err) {
                console.error(`Failed to fetch reviews for product ${product.id}:`, err);
              }
            })
          );

          setProductRatings(ratingsMap);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchBoxes = async () => {
      try {
        setIsLoadingBoxes(true);
        const response = await mysteryBoxService.getForBuyer();

        if (response.result) {
          setMysteryBoxes(response.result);
        }
      } catch (err) {
        console.error('Failed to fetch boxes:', err);
      } finally {
        setIsLoadingBoxes(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await categoryService.getAll();
        if (res.result) setCategories(res.result);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };

    fetchProducts();
    fetchBoxes();
    fetchCategories();
  }, []);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = normalizeSearch(searchQuery);
    return products.filter(p =>
      normalizeSearch(p.productName).includes(q) ||
      (p.description && normalizeSearch(p.description).includes(q)) ||
      (p.shopName && normalizeSearch(p.shopName).includes(q))
    );
  }, [products, searchQuery]);

  const clearSearch = () => {
    navigate('/');
  };

  return (
    <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero & Banner Sections — Hidden during search */}
      {!isSearching && (
        <>
          {/* Hero Section */}
          <div className="relative h-[480px] w-full rounded-3xl overflow-hidden mb-12 group shadow-xl">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: 'url("/home.png")' }}></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center px-12">
              <div className="max-w-xl text-white">
                <span className="inline-block bg-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">Từ Nông Trại Đến Bàn Ăn</span>
                <h1 className="text-5xl md:text-6xl font-black mb-6 leading-[1.1] font-display uppercase tracking-tight">Nông sản mộc mạc,<br /><span className="text-primary italic">Giá trị thật.</span></h1>
                <p className="text-lg text-gray-200 mb-8 max-w-md leading-relaxed">
                  {featuredStory}
                </p>
                <div className="flex gap-4">
                  <button className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/20 transition-all transform hover:-translate-y-1" onClick={() => navigate('/search')}>Mua sắm ngay</button>
                  <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-xl font-bold text-lg transition-all" onClick={() => navigate('/search')}>Tìm hiểu thêm</button>
                </div>
              </div>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-16">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICON_MAP[cat.name] ?? Leaf;
                return (
                  <div key={cat.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="size-16 bg-green-50/50 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <Icon className="size-7" />
                    </div>
                    <span className="text-sm font-black text-gray-800 font-display">{cat.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Blind Box Banner */}
          <div id="goi-mu" className="mb-16 scroll-mt-32">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase font-display">Túi mù hôm nay</h2>
                <p className="text-primary font-bold flex items-center gap-2">
                  <Zap className="size-4 fill-current" /> Tiết kiệm 50% so với mua lẻ
                </p>
              </div>
              <button onClick={() => navigate('/mystery-boxes')} className="text-primary font-bold flex items-center gap-2 hover:underline group">
                Xem tất cả <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {isLoadingBoxes ? (
                <div className="col-span-full py-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Đang tải túi mù...</div>
              ) : mysteryBoxes.length > 0 ? (
                mysteryBoxes.slice(0, 3).map((box) => (
                  <div
                    key={box.id}
                    onClick={() => onSelectProduct(`box-${box.id}`)}
                    className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-100 flex flex-col group p-4 cursor-pointer"
                  >
                    {/* Image area — mirrors product card structure */}
                    <div className="relative h-48 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-6 overflow-hidden">
                      {box.imageUrl ? (
                        <img src={box.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={box.boxType} />
                      ) : (
                        <>
                          <ShoppingCart className="size-20 text-green-200 group-hover:scale-110 transition-transform duration-500" />
                          <span className="absolute text-3xl font-black text-primary/40">?</span>
                        </>
                      )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <Award className="size-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase">Cam kết sạch</span>
                      </div>
                      {/* Cart icon — same pattern as product cards */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectProduct(`box-${box.id}`); }}
                        className="absolute bottom-3 right-3 size-10 bg-primary text-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                      >
                        <ShoppingCart className="size-5" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-extrabold text-lg text-gray-900 truncate pr-2 uppercase tracking-tight">{box.boxType}</h4>
                        <span className="text-primary font-black text-xl whitespace-nowrap">{box.price.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium line-clamp-2 min-h-[32px]">{box.description || 'Hộp quà nông sản bí ẩn từ farm'}</p>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                        <MapPin className="size-3" /> Nông trại đối tác
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectProduct(`box-${box.id}`); }}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 rounded-xl transition-all mt-2 active:scale-95"
                      >
                        CHỌN TÚI NÀY
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-10 bg-gray-50 rounded-3xl text-center border-2 border-dashed border-gray-200">
                  <Package className="size-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Hiện chưa có túi mù nào khả dụng</p>
                </div>
              )}
            </div>
          </div>

        </>
      )}

      {/* Featured Products / Search Results Section */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-8 px-2">
          <h2 className="text-3xl font-black uppercase font-display text-gray-900">
            {isSearching ? `Kết quả cho "${searchQuery}"` : 'Dành cho bạn hôm nay'}
          </h2>
          {isSearching && (
            <button
              onClick={clearSearch}
              className="flex items-center gap-2 text-gray-400 hover:text-red-500 font-bold text-sm transition-colors"
            >
              <X className="size-4" /> Xóa tìm kiếm
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-gray-400 font-bold">Đang tải sản phẩm tươi sạch...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-10 rounded-[32px] text-center border border-red-100">
            <p className="text-red-500 font-bold">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-primary font-black underline">Tải lại trang</button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
            <SearchX className="size-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-black text-gray-800 mb-2">Không tìm thấy sản phẩm nào</h3>
            <p className="text-gray-500 font-medium mb-8 text-center max-w-xs">Chúng mình không tìm thấy sản phẩm khớp với từ khóa của bạn. Thử tìm từ khác xem sao?</p>
            <button
              onClick={clearSearch}
              className="px-8 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
              {filteredProducts.slice(0, isSearching ? Infinity : 8).map((product) => {
                const productRating = productRatings[product.id];
                const rating = productRating?.average || 0;
                const reviewCount = productRating?.count || 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => onSelectProduct(product.id.toString())}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col cursor-pointer group"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={product.imageUrl || 'https://picsum.photos/seed/product/400/300'} alt={product.productName} />
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectProduct(product.id.toString()); }}
                        className="absolute bottom-4 right-4 size-10 bg-primary text-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                      >
                        <ShoppingCart className="size-5" />
                      </button>
                    </div>
                    <div className="p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-primary text-[10px] font-bold uppercase">Nông sản</span>
                        <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold">
                          <MapPin className="size-3" /> {product.shopName || (product.shopId ? `Farm #${product.shopId}` : 'Vườn nhà')}
                        </div>
                      </div>
                      <h3 className="text-gray-900 font-extrabold text-lg line-clamp-1">{product.productName}</h3>
                      {rating > 0 && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="size-4 fill-current" />
                          <span className="text-xs font-bold text-gray-900">{rating.toFixed(1)}</span>
                          {reviewCount > 0 && (
                            <span className="text-gray-400 text-[10px]">({reviewCount})</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-end justify-between mt-2">
                        <div className="flex flex-col">
                          {product.salePrice != null && product.salePrice > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-red-500 text-sm line-through font-semibold">{(product.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
                                <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">-{product.discountPercent}%</span>
                              </div>
                              <span className="text-primary font-black text-2xl">{product.salePrice.toLocaleString('vi-VN')}đ</span>
                            </>
                          ) : (
                            <span className="text-primary font-black text-2xl">{(product.sellingPrice || 0).toLocaleString('vi-VN')}đ</span>
                          )}
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Mỗi kg</span>
                        </div>
                        <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-md">TƯƠI SẠCH</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isSearching && (
              <button
                onClick={() => navigate('/search')}
                className="px-8 py-3 bg-white border-2 border-primary text-primary font-black rounded-xl hover:bg-primary hover:text-white transition-colors duration-300 shadow-sm"
              >
                Xem Tất Cả Sản Phẩm
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default BuyerHome;
