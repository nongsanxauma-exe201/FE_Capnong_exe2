import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Award, MapPin, Package, Loader2 } from 'lucide-react';
import { mysteryBoxService, MysteryBox } from '../../services';

const AllMysteryBoxes: React.FC = () => {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState<MysteryBox[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchBoxes = async () => {
    try {
      setLoading(true);
      const res = await mysteryBoxService.getForBuyer();

      if (res.result) {
        setBoxes(res.result);
      }
    } catch (err) {
      console.error('Failed to fetch buyer mystery boxes:', err);
      setBoxes([]);
    } finally {
      setLoading(false);
    }
  };

  fetchBoxes();
}, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="size-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase">Tất Cả Túi Mù</h1>
            <p className="text-xs text-gray-400 font-bold">{boxes.length} túi mù đang có sẵn</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="size-10 text-primary animate-spin" />
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Đang tải...</p>
          </div>
        ) : boxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <Package className="size-16 text-gray-300 mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Hiện chưa có túi mù nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {boxes.map((box) => (
              <div key={box.id} onClick={() => navigate(`/mystery-box/${box.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col group cursor-pointer p-4">
                <div className="relative h-44 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-4 overflow-hidden">
                  {box.imageUrl ? (
                    <img src={box.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={box.boxType} />
                  ) : (
                    <>
                      <ShoppingCart className="size-16 text-green-200 group-hover:scale-110 transition-transform duration-500" />
                      <span className="absolute text-3xl font-black text-primary/40">?</span>
                    </>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Award className="size-3 text-green-600" />
                    <span className="text-[9px] font-bold uppercase">Cam kết sạch</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-gray-900 truncate pr-2 uppercase tracking-tight">{box.boxType}</h4>
                    <span className="text-primary font-black whitespace-nowrap">{box.price.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 flex-1">{box.description || 'Hộp quà nông sản bí ẩn từ farm'}</p>
                  <div className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                    <MapPin className="size-3" /> Nông trại đối tác
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/mystery-box/${box.id}`); }}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-black py-2.5 rounded-xl transition-all mt-1 text-sm">
                    CHỌN TÚI NÀY
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllMysteryBoxes;
