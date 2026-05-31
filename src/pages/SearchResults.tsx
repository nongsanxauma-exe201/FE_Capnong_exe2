import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { productService, ProductResponse, mysteryBoxService, MysteryBox, reviewService, ReviewResponse } from '../services';
import {
  Star,
  MapPin,
  ShoppingCart,
  Loader2,
  SearchX,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Award,
  SlidersHorizontal,
} from 'lucide-react';

interface SearchResultsProps {
  onSelectProduct: (id: string) => void;
}

type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'name-asc' | 'name-desc';
type PriceFilter = 'all' | 'under-50k' | '50k-200k' | 'over-200k';

const SearchResults: React.FC<SearchResultsProps> = ({ onSelectProduct }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [mysteryBoxes, setMysteryBoxes] = useState<MysteryBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);

  const categoryOptions = [
    { key: 'cu-gia-vi', categoryId: 1, name: 'Củ gia vị' },
    { key: 'cu-thuc-pham', categoryId: 1, name: 'Củ thực phẩm' },
    { key: 'trai-cay-nhiet-doi', categoryId: 2, name: 'Trái cây nhiệt đới' },
    { key: 'trai-cay-quanh-nam', categoryId: 2, name: 'Trái cây quanh năm' },
  ];

  const handleCategoryChange = (key: string, catId: number) => {
    if (selectedCategoryKey === key) {
      setSelectedCategoryKey(null);
      setSelectedCategoryId(null);
    } else {
      setSelectedCategoryKey(key);
      setSelectedCategoryId(catId);
    }
  };
  const [showFilters, setShowFilters] = useState(false);
  const [productRatings, setProductRatings] = useState<Record<number, { average: number; count: number }>>({});
  const itemsPerPage = 12;

  // Get search query from URL
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q') || queryParams.get('search') || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [productsRes, boxesRes] = await Promise.all([
          productService.getForBuyer().catch(() => ({ result: [] as ProductResponse[] })),
          mysteryBoxService.getForBuyer().catch(() => ({ result: [] as MysteryBox[] })),
        ]);

        const buyerProducts = Array.isArray(productsRes.result)
          ? productsRes.result.filter((p) => p && p.id && !isNaN(Number(p.id)))
          : [];

        setProducts(buyerProducts);

        const buyerBoxes = Array.isArray(boxesRes.result)
          ? boxesRes.result.filter((b) => b && b.id)
          : [];

        setMysteryBoxes(buyerBoxes);

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
                const average = reviews.reduce((sum, r) => sum + Number(r.ratingStar || 0), 0) / reviews.length;
                ratingsMap[product.id] = {
                  average,
                  count: reviews.length,
                };
              }
            } catch (err) {
              console.error(`Failed to fetch reviews for product ${product.id}:`, err);
            }
          })
        );

        setProductRatings(ratingsMap);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


// Filter and sort all items
const filteredResults = useMemo(() => {
  const lowQuery = searchQuery.toLowerCase();

  // Filter by search query
  let filteredProducts = searchQuery
    ? products.filter(p =>
      p && p.productName && (
        p.productName.toLowerCase().includes(lowQuery) ||
        (p.description && p.description.toLowerCase().includes(lowQuery)) ||
        (p.shopName && p.shopName.toLowerCase().includes(lowQuery))
      )
    )
    : products;

  let filteredBoxes = searchQuery
    ? mysteryBoxes.filter(b =>
      b && b.boxType && (
        b.boxType.toLowerCase().includes(lowQuery) ||
        (b.description && b.description.toLowerCase().includes(lowQuery))
      )
    )
    : mysteryBoxes;

  // Filter by Category
  if (selectedCategoryId !== null) {
    filteredProducts = filteredProducts.filter(p => p.categoryId === selectedCategoryId);
    filteredBoxes = [];
  }

  // Filter by price
  if (priceFilter !== 'all') {
    filteredProducts = filteredProducts.filter(p => {
      const price = p.sellingPrice || 0;
      if (priceFilter === 'under-50k') return price < 50000;
      if (priceFilter === '50k-200k') return price >= 50000 && price <= 200000;
      if (priceFilter === 'over-200k') return price > 200000;
      return true;
    });

    filteredBoxes = filteredBoxes.filter(b => {
      const price = b.price || 0;
      if (priceFilter === 'under-50k') return price < 50000;
      if (priceFilter === '50k-200k') return price >= 50000 && price <= 200000;
      if (priceFilter === 'over-200k') return price > 200000;
      return true;
    });
  }

  // Filter by rating (mock rating for now)
  if (minRating > 0) {
    // Since we don't have real ratings, we'll keep all items
  }

  return {
    products: filteredProducts,
    boxes: filteredBoxes,
    total: filteredProducts.length + filteredBoxes.length,
  };
}, [products, mysteryBoxes, searchQuery, priceFilter, minRating, selectedCategoryId]);

// Combine and sort all results
const allResults = useMemo(() => {
  const combined = [
    ...filteredResults.products.map(p => ({ type: 'product' as const, data: p, price: p.sellingPrice || 0, name: p.productName || '' })),
    ...filteredResults.boxes.map(b => ({ type: 'box' as const, data: b, price: b.price || 0, name: b.boxType || '' })),
  ];

  // Sort based on selected option
  return combined.sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name-asc':
        return a.name.localeCompare(b.name, 'vi');
      case 'name-desc':
        return b.name.localeCompare(a.name, 'vi');
      case 'rating':
        // Mock: keep original order (in production, sort by actual rating)
        return 0;
      case 'newest':
        // Mock: keep original order (in production, sort by creation date)
        return 0;
      case 'popular':
      default:
        // Mock: keep original order (in production, sort by sold count)
        return 0;
    }
  });
}, [filteredResults, sortBy]);

// Pagination
const totalPages = Math.ceil(allResults.length / itemsPerPage);
const paginatedResults = allResults.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

const clearSearch = () => {
  navigate('/');
};

const clearFilters = () => {
  setPriceFilter('all');
  setMinRating(0);
  setSelectedCategoryId(null);
  setSelectedCategoryKey(null);
  setSortBy('popular');
};

const handlePageChange = (page: number) => {
  setCurrentPage(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

return (
  <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8 flex gap-8">
    {/* Left Sidebar - Filters */}
    <aside className={`${showFilters ? 'block' : 'hidden'} lg:flex flex-col w-64 h-fit sticky top-[136px] bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar`}>
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-gray-900 text-lg">Bộ lọc</h3>
        <button onClick={() => setShowFilters(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
          <X className="size-5" />
        </button>
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Danh mục sản phẩm</h4>
        <div className="flex flex-col gap-2">
          {categoryOptions.map((cat) => (
            <label key={cat.key} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategoryKey === cat.key}
                onChange={() => handleCategoryChange(cat.key, cat.categoryId)}
                className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className={`text-[13px] transition-colors ${selectedCategoryKey === cat.key ? 'text-primary font-bold' : 'text-gray-600 group-hover:text-primary'}`}>
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Filter */}
      <div>
        <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Lọc theo giá</h4>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="price"
              checked={priceFilter === 'all'}
              onChange={() => setPriceFilter('all')}
              className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
            />
            <span className="text-[13px] text-gray-600 group-hover:text-primary transition-colors">Tất cả</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="price"
              checked={priceFilter === 'under-50k'}
              onChange={() => setPriceFilter('under-50k')}
              className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
            />
            <span className="text-[13px] text-gray-600 group-hover:text-primary transition-colors">Dưới 50k</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="price"
              checked={priceFilter === '50k-200k'}
              onChange={() => setPriceFilter('50k-200k')}
              className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
            />
            <span className="text-[13px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">50k - 200k</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="price"
              checked={priceFilter === 'over-200k'}
              onChange={() => setPriceFilter('over-200k')}
              className="w-3.5 h-3.5 text-primary focus:ring-primary border-gray-300"
            />
            <span className="text-[13px] text-gray-600 group-hover:text-primary transition-colors whitespace-nowrap">Trên 200k</span>
          </label>
        </div>
      </div>

      {/* Rating Filter */}
      <div>
        <h4 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wider">Đánh giá</h4>
        <div className="space-y-1">
          {[4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setMinRating(minRating === rating ? 0 : rating)}
              className={`flex items-center gap-2 py-1 text-sm transition-colors w-full ${minRating === rating ? 'text-primary font-bold' : 'text-gray-600 hover:text-primary'
                }`}
            >
              <div className="flex text-yellow-500">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className={`size-3.5 ${i < rating ? 'fill-current' : ''}`} />
                ))}
              </div>
              <span className="text-[13px]">Trở lên</span>
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters Button */}
      <button
        onClick={clearFilters}
        className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
      >
        Xóa bộ lọc
      </button>
    </aside>

    {/* Main Content */}
    <section className="flex-1 min-w-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-bold text-primary/60 uppercase tracking-widest mb-6">
        <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">
          Trang chủ
        </button>
        <ChevronRight className="size-3" />
        <span className="text-primary">{searchQuery ? 'Kết quả tìm kiếm' : 'Tất cả sản phẩm'}</span>
      </nav>

      {/* Header Section */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div className="flex-1">
            <h1 className="font-display text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              {searchQuery ? `Kết quả cho "${searchQuery}"` : 'Danh sách Sản phẩm Nông Sản'}
            </h1>
            <p className="text-gray-500 font-medium">
              {isLoading ? 'Đang tải...' : `Tìm thấy ${filteredResults.total} sản phẩm`}
            </p>
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="size-4" />
              <span className="text-sm font-bold">Lọc</span>
            </button>

            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-sm font-medium text-gray-600 hidden sm:inline">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary cursor-pointer pr-8"
              >
                <option value="popular">Bán chạy nhất</option>
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá: Thấp đến Cao</option>
                <option value="price-desc">Giá: Cao đến Thấp</option>
                <option value="name-asc">Tên: A-Z</option>
                <option value="name-desc">Tên: Z-A</option>
                <option value="rating">Đánh giá cao</option>
              </select>
            </div>
          </div>
        </div>

        {searchQuery && (
          <button
            onClick={clearSearch}
            className="flex items-center gap-2 text-gray-400 hover:text-red-500 font-bold text-sm transition-colors px-4 py-2 rounded-xl hover:bg-red-50"
          >
            <X className="size-4" /> Xóa tìm kiếm
          </button>
        )}
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-gray-400 font-bold">Đang tải sản phẩm...</p>
        </div>
      ) : allResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
          <SearchX className="size-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-black text-gray-800 mb-2">Không tìm thấy sản phẩm nào</h3>
          <p className="text-gray-500 font-medium mb-8 text-center max-w-xs">
            {searchQuery
              ? 'Chúng mình không tìm thấy sản phẩm khớp với từ khóa của bạn. Thử tìm từ khác xem sao?'
              : 'Không có sản phẩm nào phù hợp với bộ lọc của bạn.'
            }
          </p>
          <button
            onClick={() => { clearSearch(); clearFilters(); }}
            className="px-8 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      ) : (
        <>
          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {paginatedResults.map((result, index) => {
              if (result.type === 'product') {
                const product = result.data as ProductResponse;
                const productRating = productRatings[product.id];
                const rating = productRating?.average || 0;
                const reviewCount = productRating?.count || 0;

                return (
                  <div
                    key={`product-${product.id}`}
                    onClick={() => onSelectProduct(product.id?.toString() || '')}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col cursor-pointer group"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        src={product.imageUrl || 'https://picsum.photos/seed/product/400/400'}
                        alt={product.productName || 'Sản phẩm'}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Organic
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectProduct(product.id?.toString() || ''); }}
                        className="absolute bottom-3 right-3 size-10 bg-primary text-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                      >
                        <ShoppingCart className="size-4" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <h3 className="text-base font-extrabold text-gray-900 line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">
                        {product.productName || 'Sản phẩm'}
                      </h3>
                      <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                        <MapPin className="size-3" /> {product.shopName || 'Vườn nhà'}
                      </div>
                      {rating > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="flex text-yellow-500">
                            <Star className="size-3 fill-current" />
                          </div>
                          <span className="text-xs font-bold text-gray-900">{rating.toFixed(1)}</span>
                          {reviewCount > 0 && (
                            <span className="text-[10px] text-gray-400">({reviewCount})</span>
                          )}
                        </div>
                      )}
                      <div className="flex items-baseline gap-1 mt-auto pt-2">
                        <span className="text-xl font-black text-gray-900">
                          {(product.sellingPrice || 0).toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          / {product.unit || 'kg'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const box = result.data as MysteryBox;
                return (
                  <div
                    key={`box-${box.id}`}
                    onClick={() => onSelectProduct(`box-${box.id}`)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 flex flex-col group cursor-pointer"
                  >
                    <div className="relative aspect-square rounded-lg bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center overflow-hidden m-4 mb-0">
                      {box.imageUrl ? (
                        <img src={box.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={box.boxType || 'Túi mù'} />
                      ) : (
                        <>
                          <Package className="size-16 text-green-200 group-hover:scale-110 transition-transform duration-500" />
                          <span className="absolute text-2xl font-black text-primary/40">?</span>
                        </>
                      )}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <Award className="size-3 text-green-600" />
                        <span className="text-[10px] font-bold uppercase">Túi mù</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectProduct(`box-${box.id}`); }}
                        className="absolute bottom-2 right-2 size-10 bg-primary text-white rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                      >
                        <ShoppingCart className="size-4" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <h4 className="font-extrabold text-base text-gray-900 line-clamp-2 min-h-[40px] uppercase tracking-tight group-hover:text-primary transition-colors">
                        {box.boxType || 'Túi mù'}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium line-clamp-2">
                        {box.description || 'Hộp quà nông sản bí ẩn từ farm'}
                      </p>
                      <div className="flex items-baseline gap-1 mt-auto pt-2">
                        <span className="text-xl font-black text-gray-900">
                          {(box.price || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-primary"
              >
                <ChevronLeft className="size-5" />
              </button>

              <div className="flex gap-2">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 rounded-full font-bold text-sm transition-colors ${currentPage === pageNum
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="w-10 h-10 flex items-center justify-center font-bold text-sm text-gray-400">...</span>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="w-10 h-10 rounded-full hover:bg-gray-100 transition-colors font-bold text-sm text-gray-700"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-full border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-primary"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  </main>
);
};

export default SearchResults;
