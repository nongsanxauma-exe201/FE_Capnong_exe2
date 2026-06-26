/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Utensils,
  Calendar,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Leaf,
  ChevronRight,
  RefreshCw,
  Trash2,
  Plus,
  X,
  List,
  ChevronDown,
  ChevronUp,
  Store
} from 'lucide-react';
import { buildPlanService } from '../../services/buildPlan.service';
import { comboService, BuildComboResponse, ShopComboCountResponse } from '../../services/combo.service';
import { productService, ProductResponse } from '../../services/product.service';
import { cartService } from '../../services/cart.service';
import { useAuth } from '../../contexts/AuthContext';
import { BuildPlanDetailRequest, BuildPlanResponse, PlanDayRequest, MealRequest, MealItemRequest } from '../../types';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

// --- Types ---

type MealType = 'Sáng' | 'Trưa' | 'Tối' | 'Bữa phụ';
type EatingStyle = 'Gia đình' | 'Giảm cân' | 'Ăn chay' | 'Bình dân';

interface Ingredient {
  id: string; // Product ID
  name: string;
  unit: string;
  isUglyProduce?: boolean;
  pricePerKg: number;
}

interface RecipeItem {
  ingredientId: string;
  quantityPerPerson: number;
}

interface Dish {
  id: string; // Combo ID
  name: string;
  mealType: MealType;
  style: EatingStyle[];
  recipes: RecipeItem[];
  image?: string;
  price?: number;
  shopOwnerId?: number;
}

interface MealInstance {
  id: string; // UI unique identifier
  label: string; // Display name
  type: MealType; // Category
  dishes: Dish[];
}

interface MealPlanDay {
  day: number;
  meals: MealInstance[];
}

// --- End Of Types ---

export default function MealPlan() {
  const [numPeople, setNumPeople] = useState<number>(2);
  const [style, setStyle] = useState<EatingStyle>('Gia đình');
  const [numDays, setNumDays] = useState<number>(3);
  const [mealPlan, setMealPlan] = useState<MealPlanDay[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [planId, setPlanId] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string>('');
  const [allCombos, setAllCombos] = useState<BuildComboResponse[]>([]);
  const [allProducts, setAllProducts] = useState<ProductResponse[]>([]);
  const [editingMeal, setEditingMeal] = useState<{ dayIndex: number, mealId: string } | null>(null);
  const [isRenaming, setIsRenaming] = useState<{ dayIndex: number, mealId: string } | null>(null);
  const [allPlans, setAllPlans] = useState<BuildPlanResponse[]>([]);
  const [showPlansList, setShowPlansList] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [viewingDish, setViewingDish] = useState<Dish | null>(null);
  const [allShops, setAllShops] = useState<ShopComboCountResponse[]>([]);
  const [lockedShopId, setLockedShopId] = useState<number | null>(null);
  const [expandedShops, setExpandedShops] = useState<Record<number, boolean>>({});

  const { user } = useAuth();
  const navigate = useNavigate();

  // Map Backend MealType
  const mapToBackendType = (type: MealType): string => {
    switch (type) {
      case 'Sáng': return 'BREAKFAST';
      case 'Trưa': return 'LUNCH';
      case 'Tối': return 'DINNER';
      case 'Bữa phụ': return 'SNACK';
      default: return 'LUNCH';
    }
  };

  // Map From Backend MealType (Case-insensitive)
  const mapFromBackendType = (type: string): MealType => {
    const t = type?.toUpperCase();
    if (t?.includes('SÁNG') || t?.includes('BREAKFAST') || t?.includes('MORNING')) return 'Sáng';
    if (t?.includes('TRƯA') || t?.includes('LUNCH') || t?.includes('NOON')) return 'Trưa';
    if (t?.includes('TỐI') || t?.includes('DINNER') || t?.includes('EVENING')) return 'Tối';
    if (t?.includes('PHỤ') || t?.includes('SNACK')) return 'Bữa phụ';
    return 'Trưa';
  };

  // Map Backend Eating Style
  const mapToBackendStyle = (style: EatingStyle): string => {
    switch (style) {
      case 'Gia đình': return 'FAMILY';
      case 'Giảm cân': return 'DIET';
      case 'Ăn chay': return 'VEGAN';
      case 'Bình dân': return 'ECONOMY';
      default: return 'FAMILY';
    }
  };

  // Map From Backend Eating Style (Case-insensitive)
  const mapFromBackendStyle = (style: string): EatingStyle => {
    const s = style?.toUpperCase();
    switch (s) {
      case 'FAMILY': return 'Gia đình';
      case 'DIET': return 'Giảm cân';
      case 'VEGAN': return 'Ăn chay';
      case 'ECONOMY': return 'Bình dân';
      default: return 'Gia đình';
    }
  };

  // Convert Backend Combo to Frontend Dish
  const mapComboToDish = (combo: BuildComboResponse): Dish => {
    const mealType = mapFromBackendType(combo.mealType || 'LUNCH');
    const style = mapFromBackendStyle(combo.type || 'FAMILY');

    return {
      id: combo.id?.toString() || '',
      name: combo.comboName || 'Món ăn mới',
      mealType: mealType,
      style: [style],
      price: combo.discountPrice,
      image: (combo.items && combo.items[0]?.productName) ? `https://picsum.photos/seed/${combo.id}/200/200` : undefined, // Placeholder if no image
      recipes: (combo.items || []).map(item => ({
        ingredientId: item.productId?.toString() || '',
        quantityPerPerson: item.quantity
      })),
      shopOwnerId: combo.shopOwnerId
    };
  };

  const dishes: Dish[] = useMemo(() => {
    return allCombos.map(mapComboToDish);
  }, [allCombos]);

  // Fetch initial data
  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [comboRes, productRes, shopRes] = await Promise.all([
          comboService.getAll(),
          productService.getForBuyer(),
          comboService.getShopsByComboCount()
        ]);

        if (comboRes.result) setAllCombos(comboRes.result);
        if (productRes.result) setAllProducts(productRes.result);
        if (shopRes.result) setAllShops(shopRes.result);

        if (user) {
          const planRes = await buildPlanService.getPlansByUser(parseInt(user.id));
          if (planRes.result) {
            setAllPlans(planRes.result);
            if (planRes.result.length > 0) {
              const lastPlan = planRes.result[planRes.result.length - 1];
              loadPlanFromResponse(lastPlan, comboRes.result || []);
              return;
            }
          }
        }
        if (comboRes.result && comboRes.result.length > 0) {
          // Default to the first shop (the one with most combos)
          if (shopRes.result && shopRes.result.length > 0) {
            setLockedShopId(shopRes.result[0].shopId);
          }
          generatePlanWithCombos(comboRes.result);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };
    loadInitialData();
  }, [user]);

  const fetchSavedPlans = async () => {
    if (!user) return;
    try {
      const res = await buildPlanService.getPlansByUser(parseInt(user.id));
      if (res.result) setAllPlans(res.result);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  };

  const handleDeleteAnyPlan = async (id: number) => {
    if (!await globalShowConfirm("Bạn có chắc chắn muốn xóa thực đơn này?", "Xác nhận xóa")) return;
    try {
      await buildPlanService.deletePlan(id);
      globalShowAlert("Đã xóa thực đơn thành công!", "Thành công", "success");
      if (id === planId) {
        setPlanId(null);
        setPlanName('');
        generatePlan();
      }
      fetchSavedPlans();
    } catch (err) {
      console.error("Error deleting plan:", err);
      globalShowAlert("Không thể xóa thực đơn. Vui lòng thử lại.", "Lỗi", "error");
    }
  };

  const loadPlanFromResponse = (response: BuildPlanResponse, combos: BuildComboResponse[]) => {
    setPlanId(response.id);
    setPlanName(response.planName);
    setNumPeople(response.numberOfPeople);
    setNumDays(response.numberOfDays);
    setStyle(mapFromBackendStyle(response.mealType));

    const currentDishes = combos.map(mapComboToDish);

    const newPlan: MealPlanDay[] = response.days.map(day => {
      // Group meals from backend
      const mealInstances: MealInstance[] = day.meals.map((m, idx) => {
        const frontendType = mapFromBackendType(m.mealType);

        // Lấy tất cả comboId từ meal items
        const dishIds = (m.items || []).map(i => i.combo?.id?.toString()).filter(id => id !== undefined);

        // Tìm các món ăn tương ứng trong danh sách combo hiện có
        const foundDishes = currentDishes.filter(d => dishIds.includes(d.id));

        // Trường hợp không tìm thấy trong currentDishes nhưng có thông tin cơ bản trong item.combo
        const finalDishes = (m.items || []).map(item => {
          const comboIdStr = item.combo?.id?.toString();
          const existing = foundDishes.find(d => d.id === comboIdStr);
          if (existing) return existing;

          if (item.combo?.comboName) {
            return {
              id: comboIdStr || Math.random().toString(),
              name: item.combo.comboName,
              mealType: frontendType,
              style: [style],
              price: item.combo.discountPrice || 0,
              image: `https://picsum.photos/seed/${comboIdStr}/200/200`,
              recipes: []
            } as Dish;
          }
          return null;
        }).filter((d): d is Dish => d !== null);

        return {
          id: `${day.id || day.dayIndex}-${idx}`,
          label: frontendType,
          type: frontendType,
          dishes: finalDishes.length > 0 ? finalDishes : foundDishes
        };
      });

      return {
        day: day.dayIndex,
        meals: mealInstances
      };
    });

    setLockedShopId(response.days[0]?.meals[0]?.items[0]?.combo?.shopOwnerId || null);
    setMealPlan(newPlan);
    setIsGenerated(true);
  };

  const generatePlan = () => {
    if (!planName) {
      setPlanName(`Thực đơn cho ${numPeople} người - ${numDays} ngày`);
    }
    generatePlanWithCombos(allCombos);
  };

  const generatePlanWithCombos = (combos: BuildComboResponse[], shopIdOverride?: number) => {
    // Determine target shop
    let currentLockedId = (shopIdOverride !== undefined) ? shopIdOverride : lockedShopId;
    if (!currentLockedId && allShops.length > 0) {
      currentLockedId = allShops[0].shopId;
      setLockedShopId(currentLockedId);
    }

    const targetCombos = currentLockedId
      ? combos.filter(c => c.shopOwnerId === currentLockedId)
      : combos;

    const currentDishes = targetCombos.map(mapComboToDish);
    const newPlan: MealPlanDay[] = [];
    for (let i = 1; i <= numDays; i++) {
      const dayPlan: MealPlanDay = {
        day: i,
        meals: [
          createMealInstance('Sáng', 'Sáng', currentDishes),
          createMealInstance('Trưa', 'Trưa', currentDishes),
          createMealInstance('Tối', 'Tối', currentDishes),
        ]
      };
      newPlan.push(dayPlan);
    }
    setMealPlan(newPlan);
    setIsGenerated(true);
    setPlanId(null);
  };

  const createMealInstance = (label: string, type: MealType, comboList: Dish[]): MealInstance => {
    const randomDish = getRandomDishFromList(type, style, comboList);
    return {
      id: Math.random().toString(36).substr(2, 9),
      label,
      type,
      dishes: randomDish ? [randomDish] : []
    };
  };

  const addMealToDay = (dayIndex: number) => {
    setMealPlan(prev => prev.map(dp => {
      if (dp.day === dayIndex) {
        return {
          ...dp,
          meals: [...dp.meals, {
            id: Math.random().toString(36).substr(2, 9),
            label: 'Bữa phụ',
            type: 'Bữa phụ',
            dishes: []
          }]
        };
      }
      return dp;
    }));
  };

  const removeMealFromDay = (dayIndex: number, mealId: string) => {
    setMealPlan(prev => prev.map(dp => {
      if (dp.day === dayIndex) {
        return {
          ...dp,
          meals: dp.meals.filter(m => m.id !== mealId)
        };
      }
      return dp;
    }));
  };

  const renameMeal = (dayIndex: number, mealId: string, newLabel: string) => {
    setMealPlan(prev => prev.map(dp => {
      if (dp.day === dayIndex) {
        return {
          ...dp,
          meals: dp.meals.map(m => m.id === mealId ? { ...m, label: newLabel } : m)
        };
      }
      return dp;
    }));
    setIsRenaming(null);
  };

  // Adjust plan when numDays changes without full regeneration if already generated
  React.useEffect(() => {
    if (isGenerated && mealPlan.length > 0) {
      if (mealPlan.length < numDays) {
        const addedDays: MealPlanDay[] = [];
        for (let i = mealPlan.length + 1; i <= numDays; i++) {
          addedDays.push({
            day: i,
            meals: [
              createMealInstance('Sáng', 'Sáng', dishes),
              createMealInstance('Trưa', 'Trưa', dishes),
              createMealInstance('Tối', 'Tối', dishes),
            ]
          });
        }
        setMealPlan([...mealPlan, ...addedDays]);
      } else if (mealPlan.length > numDays) {
        setMealPlan(mealPlan.slice(0, numDays));
      }
    }
  }, [numDays]);

  const handleSelectShop = async (shopId: number) => {
    if (mealPlan.length > 0 && lockedShopId !== shopId) {
      if (!await globalShowConfirm(
        "Việc chọn cửa hàng mới sẽ đặt lại toàn bộ thực đơn hiện tại của bạn. Bạn có muốn tiếp tục?",
        "Thay đổi cửa hàng"
      )) return;
    }
    setLockedShopId(shopId);
    generatePlanWithCombos(allCombos, shopId);
  };

  const addDishToMeal = async (dayIndex: number, mealId: string, dish: Dish) => {
    if (lockedShopId && dish.shopOwnerId !== lockedShopId) {
      if (!await globalShowConfirm(
        "Món ăn này thuộc cửa hàng khác. Việc chọn món này sẽ đặt lại thực đơn hiện tại của bạn. Bạn có muốn tiếp tục?",
        "Thay đổi cửa hàng"
      )) return;

      setLockedShopId(dish.shopOwnerId || null);
      setMealPlan(prev => prev.map(dp => ({
        ...dp,
        meals: dp.meals.map(m => ({ ...m, dishes: [] }))
      })));
    } else if (!lockedShopId) {
      setLockedShopId(dish.shopOwnerId || null);
    }

    setMealPlan(prev => prev.map(dayPlan => {
      if (dayPlan.day === dayIndex) {
        return {
          ...dayPlan,
          meals: dayPlan.meals.map(meal => {
            if (meal.id === mealId) {
              return {
                ...meal,
                dishes: [...meal.dishes, dish]
              };
            }
            return meal;
          })
        };
      }
      return dayPlan;
    }));
  };

  const swapDays = (dayIndex1: number, dayIndex2: number) => {
    if (dayIndex1 === dayIndex2) return;
    setMealPlan(prev => {
      const newPlan = [...prev];
      const idx1 = newPlan.findIndex(d => d.day === dayIndex1);
      const idx2 = newPlan.findIndex(d => d.day === dayIndex2);
      if (idx1 !== -1 && idx2 !== -1) {
        const meals1 = newPlan[idx1].meals;
        const meals2 = newPlan[idx2].meals;

        newPlan[idx1] = { ...newPlan[idx1], meals: meals2 };
        newPlan[idx2] = { ...newPlan[idx2], meals: meals1 };
      }
      return newPlan;
    });
  };

  const moveDishBetweenMeals = (source: { day: number, mealId: string, dishId: string }, target: { day: number, mealId: string }) => {
    if (source.day === target.day && source.mealId === target.mealId) return;

    setMealPlan(prev => {
      // Find the dish to move
      const sourceDay = prev.find(d => d.day === source.day);
      const sourceMeal = sourceDay?.meals.find(m => m.id === source.mealId);
      const sourceDish = sourceMeal?.dishes.find(d => d.id === source.dishId);

      if (!sourceDish) return prev;

      return prev.map(dp => {
        let updatedMeals = [...dp.meals];

        // Remove from source
        if (dp.day === source.day) {
          updatedMeals = updatedMeals.map(m =>
            m.id === source.mealId
              ? { ...m, dishes: m.dishes.filter(d => d.id !== source.dishId) }
              : m
          );
        }

        // Add to target
        if (dp.day === target.day) {
          updatedMeals = updatedMeals.map(m =>
            m.id === target.mealId
              ? { ...m, dishes: [...m.dishes, sourceDish] }
              : m
          );
        }

        return { ...dp, meals: updatedMeals };
      });
    });
  };

  const handleManualSelection = async (dish: Dish) => {
    if (!editingMeal) return;
    await addDishToMeal(editingMeal.dayIndex, editingMeal.mealId, dish);
    setEditingMeal(null);
  };

  const toggleShop = (shopId: number) => {
    setExpandedShops(prev => ({
      ...prev,
      [shopId]: !prev[shopId]
    }));
  };

  const removeDishFromMeal = (dayIndex: number, mealId: string, dishId: string) => {
    setMealPlan(prev => prev.map(dp => {
      if (dp.day === dayIndex) {
        return {
          ...dp,
          meals: dp.meals.map(m => {
            if (m.id === mealId) {
              return { ...m, dishes: m.dishes.filter(d => d.id !== dishId) };
            }
            return m;
          })
        };
      }
      return dp;
    }));
  };

  const saveToBackend = async () => {
    if (!user) {
      globalShowAlert("Vui lòng đăng nhập để lưu thực đơn", "Yêu cầu đăng nhập", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const totalBudget = shoppingList.reduce((acc, curr) => acc + (curr.quantity * curr.pricePerKg), 0);

      const request: BuildPlanDetailRequest = {
        plan: {
          planName: planName || `Thực đơn cho ${numPeople} người - ${numDays} ngày`,
          numberOfPeople: numPeople,
          numberOfDays: numDays,
          mealType: mapToBackendStyle(style),
          targetBudget: totalBudget
        },
        days: mealPlan.map(dp => ({
          dayIndex: dp.day,
          meals: dp.meals
            .filter(m => m.dishes.length > 0)
            .map(m => ({
              mealType: mapToBackendType(m.type),
              items: m.dishes.map(d => ({
                comboId: parseInt(d.id),
                quantity: 1
              }))
            }))
        }))
      };

      let response;
      if (planId) {
        response = await buildPlanService.updatePlan(planId, request);
      } else {
        response = await buildPlanService.createPlan(request);
      }

      if (response.result) {
        setPlanId(response.result.id);
        fetchSavedPlans();
        globalShowAlert("Đã lưu thực đơn thành công!", "Thành công", "success");
      }
    } catch (err) {
      console.error("Error saving plan:", err);
      globalShowAlert("Không thể lưu thực đơn. Vui lòng thử lại.", "Lỗi", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyPlan = async (id?: number) => {
    const targetId = id || planId;
    if (!targetId) {
      globalShowAlert("Vui lòng lưu thực đơn trước khi mua", "Nhắc nhở", "warning");
      return;
    }

    if (!await globalShowConfirm("Hệ thống sẽ thêm tất cả nguyên liệu trong thực đơn này vào giỏ hàng và chuyển đến trang thanh toán. Bạn có muốn tiếp tục?", "Xác nhận mua")) {
      return;
    }

    setIsBuying(true);
    try {
      await cartService.addPlanToCart(targetId);
      navigate('/checkout');
    } catch (err) {
      console.error("Error buying plan:", err);
      globalShowAlert("Không thể thực hiện mua. Vui lòng thử lại.", "Lỗi", "error");
    } finally {
      setIsBuying(false);
    }
  };

  const handleBuyCombo = async (comboId: string) => {
    setIsBuying(true);
    try {
      await cartService.addToCart({
        buildComboId: parseInt(comboId),
        quantity: numPeople
      });
      navigate('/checkout');
    } catch (err) {
      console.error("Error buying combo:", err);
      globalShowAlert("Không thể mua món ăn này. Vui lòng thử lại.", "Lỗi", "error");
    } finally {
      setIsBuying(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planId) return;
    handleDeleteAnyPlan(planId);
  };

  const getRandomDishFromList = (type: MealType, selectedStyle: EatingStyle, list: Dish[]): Dish | null => {
    const filtered = list.filter(d => d.mealType === type);
    // Try to match style if possible, but fallback to any dish of that type if none match style
    const styleMatch = filtered.filter(d => d.style.includes(selectedStyle));
    const pool = styleMatch.length > 0 ? styleMatch : filtered;

    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)] || pool[0];
  };

  const getProductInfo = (productId: string) => {
    return allProducts.find(p => p.id.toString() === productId);
  };

  const shoppingList = useMemo(() => {
    const list: Record<string, number> = {};
    mealPlan.forEach(day => {
      day.meals.forEach(meal => {
        meal.dishes.forEach(dish => {
          dish.recipes.forEach(recipe => {
            const totalQty = recipe.quantityPerPerson * numPeople;
            list[recipe.ingredientId] = (list[recipe.ingredientId] || 0) + totalQty;
          });
        });
      });
    });

    return Object.entries(list).map(([id, qty]) => {
      const product = getProductInfo(id);
      return {
        id,
        name: product?.productName || 'Nguyên liệu',
        unit: product?.unit || 'g',
        quantity: qty,
        pricePerKg: product?.pricePerKg || product?.sellingPrice || 0,
        isUglyProduce: false // We can dynamically check if needed
      };
    });
  }, [mealPlan, numPeople, allProducts]);

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2D2D2D] font-sans selection:bg-emerald-100">


      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Configuration */}
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Utensils size={20} className="text-emerald-600" />
                Thiết lập thực đơn
              </h2>

              <div className="space-y-6">
                {/* Plan Name */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 block">Tên thực đơn</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Nhập tên thực đơn của bạn..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Num People */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 block">Số người ăn</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={numPeople}
                        onChange={(e) => setNumPeople(parseInt(e.target.value) || 1)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 block">Kiểu ăn</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Gia đình', 'Giảm cân', 'Ăn chay', 'Bình dân'].map(s => (
                      <button
                        key={s}
                        onClick={() => setStyle(s as EatingStyle)}
                        className={`py-2 px-3 rounded-xl border text-sm transition-all ${style === s
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                          : 'border-stone-200 hover:border-stone-300 text-stone-600'
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 block">Số ngày</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={numDays}
                        onChange={(e) => setNumDays(parseInt(e.target.value) || 1)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={generatePlan}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 mt-4"
                >
                  <RefreshCw size={20} />
                  {isGenerated ? 'Tự động tạo thực đơn' : 'Tạo thực đơn ngay'}
                </button>

                <button
                  onClick={() => setShowPlansList(true)}
                  className="w-full border border-stone-200 text-stone-600 py-4 rounded-xl font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <List size={20} />
                  Thực đơn đã tạo
                </button>

                {planId && (
                  <button
                    onClick={handleDeletePlan}
                    className="w-full border border-red-200 text-red-600 py-4 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <Trash2 size={20} />
                    Xóa thực đơn hiện tại
                  </button>
                )}
              </div>
            </section>

            {/* Ugly Produce Highlight */}
            <section className="bg-stone-900 text-white p-6 rounded-2xl shadow-xl overflow-hidden relative">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <AlertCircle size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Đang có sẵn</span>
                </div>
                <h3 className="text-xl font-bold mb-4">Nông sản "xấu mã"</h3>
                <div className="space-y-3">
                  {allProducts.filter(p => p.sellingPrice < 10000).slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
                      <span className="text-stone-300">{p.productName}</span>
                      <span className="text-emerald-400 font-medium">-30% giá</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-4 leading-relaxed italic">
                  * Hình dáng không hoàn hảo nhưng chất lượng vẫn tuyệt vời. Giúp giảm lãng phí thực phẩm!
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-600/20 rounded-full blur-3xl"></div>
            </section>
          </div>

          {/* Middle Column: Results */}
          <div className="lg:col-span-6 space-y-8">
            {!isGenerated ? (
              <div
                className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center text-stone-300">
                  <Utensils size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-stone-800">Chưa có thực đơn</h3>
                  <p className="text-stone-500 max-w-xs mx-auto mt-2">
                    Hãy chọn các tùy chọn bên trái để chúng tôi gợi ý thực đơn thông minh cho bạn.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="space-y-8"
              >
                {/* Meal Plan Grid */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight">{planName || 'Thực đơn của bạn'}</h2>
                      <p className="text-sm text-stone-500">Kế hoạch ăn uống thông minh</p>
                    </div>
                    <span className="text-sm text-stone-500 bg-stone-100 px-3 py-1 rounded-full font-medium">
                      {numDays} ngày • {numPeople} người • {style}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {mealPlan.map((dayPlan) => (
                      <div
                        key={dayPlan.day}
                        className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all space-y-0"
                      >
                        <div
                          className="bg-stone-50 px-8 py-5 border-b border-stone-200 flex items-center justify-between cursor-move"
                          draggable
                          onDragStart={(e) => {
                            const dragData = { type: 'DAY', dayIndex: dayPlan.day };
                            console.log("[DragStart Day]", dragData);
                            e.dataTransfer.setData('text', JSON.stringify(dragData));
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            try {
                              const rawData = e.dataTransfer.getData('text');
                              console.log("[Drop Day] RawData:", rawData);
                              if (!rawData) return;
                              const data = JSON.parse(rawData);
                              if (data.type === 'DAY') {
                                swapDays(data.dayIndex, dayPlan.day);
                              }
                            } catch (err) {
                              console.error("Day drop error:", err);
                            }
                          }}
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-stone-800 text-lg">Ngày {dayPlan.day}</span>
                            <div className="flex gap-1 text-stone-300">
                              <List size={14} />
                            </div>
                            <div className="flex gap-1">
                              {dayPlan.meals.some(m => m.dishes.some(d => d.price && d.price)) && (
                                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Ưu tiên nông sản xanh</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => addMealToDay(dayPlan.day)}
                            className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                          >
                            <Plus size={14} /> Thêm bữa ăn
                          </button>
                        </div>

                        <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                          {dayPlan.meals.map((meal) => (
                            <div
                              key={meal.id}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                try {
                                  const rawData = e.dataTransfer.getData('text');
                                  console.log("[Drop Meal] RawData:", rawData);
                                  if (!rawData) return;
                                  const data = JSON.parse(rawData);
                                  console.log("[Drop Meal] Parsed Data:", data);

                                  if (data.type === 'DISH_EXT') {
                                    addDishToMeal(dayPlan.day, meal.id, data.dish);
                                  } else if (data.type === 'DISH_INT') {
                                    moveDishBetweenMeals(data.source, { day: dayPlan.day, mealId: meal.id });
                                  } else if (data.type === 'DAY') {
                                    swapDays(data.dayIndex, dayPlan.day);
                                  }
                                } catch (err) {
                                  console.error("Meal drop error:", err);
                                }
                              }}
                              className="bg-[#FDFCF8] border border-stone-100 rounded-2xl p-4 flex flex-col group relative hover:border-emerald-200 transition-all min-h-[120px]"
                            >
                              <div className="flex items-center justify-between mb-3">
                                {isRenaming?.mealId === meal.id ? (
                                  <input
                                    autoFocus
                                    className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-white border-b border-emerald-500 outline-none w-24"
                                    defaultValue={meal.label}
                                    onBlur={(e) => renameMeal(dayPlan.day, meal.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && renameMeal(dayPlan.day, meal.id, (e.target as HTMLInputElement).value)}
                                  />
                                ) : (
                                  <span
                                    onClick={() => setIsRenaming({ dayIndex: dayPlan.day, mealId: meal.id })}
                                    className="text-[10px] font-bold uppercase tracking-widest text-stone-400 cursor-pointer hover:text-emerald-600 transition-colors"
                                  >
                                    {meal.label}
                                  </span>
                                )}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  <button
                                    onClick={() => setEditingMeal({ dayIndex: dayPlan.day, mealId: meal.id })}
                                    className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                                  >
                                    <Plus size={14} />
                                  </button>
                                  <button
                                    onClick={() => removeMealFromDay(dayPlan.day, meal.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 flex-1">
                                {meal.dishes.length > 0 ? (
                                  meal.dishes.map((dish, dIdx) => (
                                    <div
                                      key={`${dish.id}-${dIdx}`}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        const dragData = {
                                          type: 'DISH_INT',
                                          source: { day: dayPlan.day, mealId: meal.id, dishId: dish.id }
                                        };
                                        console.log("[DragStart DishInt]", dragData);
                                        e.dataTransfer.setData('text', JSON.stringify(dragData));
                                      }}
                                      className="bg-white border border-stone-50 rounded-xl p-3 shadow-sm relative group/dish cursor-pointer hover:border-emerald-500 transition-all"
                                      onClick={() => setViewingDish(dish)}
                                    >
                                      <h4 className="font-bold text-stone-800 text-xs leading-tight">{dish.name}</h4>
                                      <p className="text-[10px] text-stone-400 mt-1">{dish.price?.toLocaleString()}đ</p>

                                      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/dish:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBuyCombo(dish.id);
                                          }}
                                          className="bg-emerald-600 text-white p-1.5 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
                                          title="Mua ngay món này"
                                        >
                                          <ShoppingCart size={10} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeDishFromMeal(dayPlan.day, meal.id, dish.id);
                                          }}
                                          className="bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                          title="Xóa khỏi thực đơn"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div
                                    onClick={() => setEditingMeal({ dayIndex: dayPlan.day, mealId: meal.id })}
                                    className="flex items-center justify-center border-2 border-dashed border-stone-100 rounded-xl h-20 text-stone-300 hover:text-emerald-500 hover:border-emerald-200 cursor-pointer transition-all"
                                  >
                                    <Plus size={20} />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                Shopping List
                <section className="bg-emerald-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                          <ShoppingCart size={28} className="text-emerald-400" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold">Giỏ hàng nguyên liệu</h2>
                          <p className="text-emerald-300/80 text-sm">Tổng hợp từ thực đơn {numDays} ngày</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={saveToBackend}
                          disabled={isSaving}
                          className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-8 py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                          {isSaving ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={18} />
                          )}
                          Lưu thực đơn
                        </button>

                        {planId && (
                          <button
                            onClick={() => handleBuyPlan()}
                            disabled={isBuying}
                            className="bg-white hover:bg-stone-50 text-emerald-900 font-bold px-8 py-4 rounded-2xl transition-all shadow-lg border-2 border-emerald-500 flex items-center justify-center gap-2 group disabled:opacity-50"
                          >
                            {isBuying ? (
                              <RefreshCw size={18} className="animate-spin" />
                            ) : (
                              <ShoppingCart size={18} />
                            )}
                            Mua tất cả
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shoppingList.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${item.isUglyProduce
                            ? 'bg-emerald-800/40 border-emerald-500/30'
                            : 'bg-white/5 border-white/10'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${item.isUglyProduce ? 'bg-emerald-400' : 'bg-white/30'}`}></div>
                            <div>
                              <p className="font-bold">{item.name}</p>
                              {item.isUglyProduce && (
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Nông sản xấu mã</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-lg font-bold">
                              {item.quantity >= 1000 ? (item.quantity / 1000).toFixed(1) : item.quantity}
                              <span className="text-xs ml-1 opacity-60 font-sans">{item.quantity >= 1000 ? 'kg' : item.unit}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-300 text-sm">
                        <CheckCircle2 size={16} />
                        <span>Đã tối ưu hóa theo lượng người ăn ({numPeople} người)</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-emerald-300/60 uppercase tracking-widest font-bold">Ước tính</p>
                        <p className="text-2xl font-bold">
                          {Math.round(shoppingList.reduce((acc, curr) => acc + (curr.quantity * curr.pricePerKg), 0)).toLocaleString()}đ
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>
                </section>
              </div>
            )}
          </div>

          {/* Right Column: Shop List */}
          <div className="lg:col-span-3 space-y-6">
            <section className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm sticky top-8">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Store size={20} className="text-emerald-600" />
                Cửa hàng đề xuất
              </h2>

              <div className="space-y-3">
                {allShops.map(shop => {
                  const isLocked = lockedShopId === shop.shopId;
                  const isExpanded = expandedShops[shop.shopId];
                  const shopCombos = allCombos.filter(c => c.shopOwnerId === shop.shopId);

                  return (
                    <div
                      key={shop.shopId}
                      className={`border rounded-2xl transition-all overflow-hidden ${isLocked ? 'border-emerald-500 bg-emerald-50/10' : 'border-stone-100'
                        }`}
                    >
                      <div
                        onClick={() => toggleShop(shop.shopId)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                            {shop.logoUrl ? (
                              <img src={shop.logoUrl} alt={shop.shopName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <Store size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-stone-800 line-clamp-1">{shop.shopName || 'Cửa hàng'}</h3>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{shop.comboCount} Combo</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isLocked && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectShop(shop.shopId);
                              }}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded transition-colors"
                            >
                              Chọn
                            </button>
                          )}
                          {isLocked && <CheckCircle2 size={16} className="text-emerald-500" />}
                          {isExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3 pt-0 space-y-2 bg-stone-50/50">
                          {shopCombos.map(combo => (
                            <div
                              key={combo.id}
                              draggable
                              onDragStart={(e) => {
                                const dragData = {
                                  type: 'DISH_EXT',
                                  dish: mapComboToDish(combo)
                                };
                                console.log("[DragStart DishExt]", dragData);
                                e.dataTransfer.setData('text', JSON.stringify(dragData));
                              }}
                              className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm hover:border-emerald-400 transition-all cursor-grab active:cursor-grabbing group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-stone-700 leading-tight group-hover:text-emerald-600">{combo.comboName}</h4>
                                <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap">{combo.discountPrice.toLocaleString()}đ</span>
                              </div>
                              <p className="text-[9px] text-stone-400 mt-1 line-clamp-2">{combo.description}</p>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex gap-1">
                                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 uppercase font-bold tracking-tighter">
                                    {mapFromBackendType(combo.mealType || 'LUNCH')}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // If no meal is being edited, just set global warning or do nothing
                                    globalShowAlert("Kéo món ăn vào ô bữa ăn trong ngày để thêm!", "Hướng dẫn", "info");
                                  }}
                                  className="p-1 hover:bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {lockedShopId && (
                <div className="mt-8 p-4 rounded-xl bg-orange-50 border border-orange-100">
                  <p className="text-[10px] text-orange-600 flex items-start gap-2 leading-relaxed">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>Thực đơn đang được khóa cho <b>{allShops.find(s => s.shopId === lockedShopId)?.shopName}</b>. Bạn chỉ có thể chọn món từ shop này.</span>
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Leaf size={20} className="text-emerald-600" />
              <span className="font-bold text-lg">EcoMeal Planner</span>
            </div>
            <p className="text-stone-500 text-sm leading-relaxed max-w-sm">
              Chúng tôi giúp bạn lên kế hoạch ăn uống lành mạnh, tiết kiệm ngân sách và giảm thiểu lãng phí thực phẩm thông qua việc ủng hộ nông sản "xấu mã".
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-4">Ứng dụng</h4>
            <ul className="space-y-2 text-sm text-stone-500">
              <li><a href="#" className="hover:text-emerald-600">Thực đơn mẫu</a></li>
              <li><a href="#" className="hover:text-emerald-600">Tính toán dinh dưỡng</a></li>
              <li><a href="#" className="hover:text-emerald-600">Bản đồ nông trại</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-widest mb-4">Liên hệ</h4>
            <ul className="space-y-2 text-sm text-stone-500">
              <li><a href="#" className="hover:text-emerald-600">Về chúng tôi</a></li>
              <li><a href="#" className="hover:text-emerald-600">Hợp tác nông dân</a></li>
              <li><a href="#" className="hover:text-emerald-600">Hỗ trợ</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-stone-200 text-center text-xs text-stone-400">
          © 2026 EcoMeal Planner. Phát triển vì một tương lai bền vững.
        </div>
      </footer>

      {/* Manual Selection Modal */}
      {editingMeal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setEditingMeal(null)}
          ></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden relative z-10 flex flex-col">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Chọn món ăn</h3>
                <p className="text-sm text-stone-500">
                  Ngày {editingMeal.dayIndex} • {mealPlan.find(dp => dp.day === editingMeal.dayIndex)?.meals.find(m => m.id === editingMeal.mealId)?.label}
                </p>
              </div>
              <button
                onClick={() => setEditingMeal(null)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const currentMeal = mealPlan.find(dp => dp.day === editingMeal.dayIndex)?.meals.find(m => m.id === editingMeal.mealId);
                let filteredDishes = currentMeal ? dishes.filter(d => d.mealType === currentMeal.type) : dishes;

                // Shop lock enforcement
                if (lockedShopId) {
                  filteredDishes = filteredDishes.filter(d => d.shopOwnerId === lockedShopId);
                }

                if (filteredDishes.length === 0) return (
                  <div className="col-span-2 py-12 text-center text-stone-500">
                    Không tìm thấy món ăn phù hợp.
                  </div>
                );

                return (
                  <>
                    {filteredDishes.map(dish => (
                      <button
                        key={dish.id}
                        onClick={() => handleManualSelection(dish)}
                        className="flex flex-col text-left border border-stone-100 rounded-2xl p-4 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all group"
                      >
                        <div className="aspect-video w-full bg-stone-100 rounded-xl mb-3 overflow-hidden">
                          {dish.image ? (
                            <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <Utensils size={32} />
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-stone-800 group-hover:text-emerald-700">{dish.name}</h4>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2">{dish.price?.toLocaleString()}đ</p>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {dish.recipes.slice(0, 2).map(r => (
                            <span key={r.ingredientId} className="text-[10px] bg-white border border-stone-100 px-1.5 py-0.5 rounded text-stone-500">
                              {getProductInfo(r.ingredientId)?.productName || '...'}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </>
                );
              })()}
            </div>

            <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-end">
              <button
                onClick={() => setEditingMeal(null)}
                className="px-6 py-2 rounded-xl font-bold text-stone-500 hover:text-stone-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Saved Plans List Modal */}
      {showPlansList && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={() => setShowPlansList(false)}
          ></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden relative z-10 flex flex-col font-sans">
            <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-emerald-50/50">
              <div>
                <h3 className="text-2xl font-bold text-stone-800">Thực đơn của tôi</h3>
                <p className="text-sm text-stone-500">Xem và quản lý các thực đơn bạn đã tạo</p>
              </div>
              <button
                onClick={() => setShowPlansList(false)}
                className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
              >
                <X size={24} className="text-stone-400" />
              </button>
            </div>

            <div className="overflow-y-auto p-8 bg-[#FDFCF8]">
              {allPlans.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-stone-100">
                  <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar size={40} className="text-stone-200" />
                  </div>
                  <h4 className="text-lg font-bold text-stone-800">Chưa có thực đơn nào</h4>
                  <p className="text-stone-500 mt-2">Hãy tạo thực đơn đầu tiên của bạn ngay!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPlans.map(plan => (
                    <div
                      key={plan.id}
                      className="border border-stone-200 rounded-2xl p-6 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-900/5 transition-all group relative bg-white flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-stone-800 group-hover:text-emerald-700 transition-colors text-lg leading-tight">
                            {plan.planName}
                          </h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnyPlan(plan.id);
                          }}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-auto mb-6">
                        <span className="text-[10px] bg-stone-100 px-3 py-1 rounded-full font-bold text-stone-600 uppercase tracking-wider">
                          {plan.numberOfPeople} người
                        </span>
                        <span className="text-[10px] bg-stone-100 px-3 py-1 rounded-full font-bold text-stone-600 uppercase tracking-wider">
                          {plan.numberOfDays} ngày
                        </span>
                        <span className="text-[10px] bg-emerald-100 px-3 py-1 rounded-full font-bold text-emerald-700 uppercase tracking-wider">
                          {mapFromBackendStyle(plan.mealType)}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          loadPlanFromResponse(plan, allCombos);
                          setShowPlansList(false);
                        }}
                        className="w-full py-3.5 bg-stone-50 hover:bg-emerald-600 hover:text-white text-stone-700 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        Mở thực đơn
                        <ChevronRight size={16} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuyPlan(plan.id);
                        }}
                        className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={16} />
                        Mua ngay
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dish Details Modal */}
      {viewingDish && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setViewingDish(null)}
          ></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 flex flex-col font-sans animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-xl font-bold text-stone-800">{viewingDish.name}</h3>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mt-1">Thành phần nguyên liệu</p>
              </div>
              <button
                onClick={() => setViewingDish(null)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={20} className="text-stone-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-stone-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Định lượng cho {numPeople} người</p>
                <div className="space-y-3">
                  {viewingDish.recipes.length > 0 ? (
                    viewingDish.recipes.map((item, idx) => {
                      const product = getProductInfo(item.ingredientId);
                      const totalQty = item.quantityPerPerson * numPeople;
                      return (
                        <div key={idx} className="flex items-center justify-between border-b border-stone-200 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 border border-stone-200">
                              <Leaf size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-stone-800">{product?.productName || 'Đang tải...'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono font-bold text-emerald-700">
                              {totalQty >= 1000 ? (totalQty / 1000).toFixed(1) : totalQty}
                              <span className="text-[10px] ml-1 font-sans text-stone-400">{totalQty >= 1000 ? 'kg' : (product?.unit || 'g')}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-stone-400 italic text-sm">
                      Dữ liệu thành phần đang được cập nhật...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleBuyCombo(viewingDish.id);
                    setViewingDish(null);
                  }}
                  className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  Mua nguyên liệu
                </button>
                <button
                  onClick={() => setViewingDish(null)}
                  className="flex-1 py-3.5 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all flex items-center justify-center"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}