
export enum AppRole {
  BUYER = 'BUYER',
  FARMER = 'FARMER',
  ADMIN = 'ADMIN',
  SHIPPER = 'SHIPPER',
  STAFF = "STAFF"
}

export enum KYCStatus {
  NONE = 'NONE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  role: AppRole;
  avatar: string;
  email: string;
  kycStatus: KYCStatus;
  phone?: string;
  address?: string;
  shopName?: string;
  bankAccount?: string;
  description?: string;
  achievement?: string;
  shopActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  unit: string;
  image: string;
  farm: string;
  distance: string;
  rating: number;
  soldCount: number;
  stock: number;
  expiry: string;
  description?: string;
}

export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  customer: {
    name: string;
    phone: string;
    address: string;
  };
}

export interface OrderItem {
  name: string;
  quantity: string;
  price: number;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',   // Farmer xác nhận → đang chuẩn bị hàng (BE enum)
  PREPARING = 'PREPARING',  // Alias UI-only (FE dùng để hiển thị thân thiện hơn)
  PAID = 'PAID',             // Đơn QR đã thanh toán thành công, chờ Farmer xác nhận
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',         // Giao thất bại / boom hàng
}

export interface ComboDish {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  image: string;
  difficulty: 'Dễ' | 'Vừa' | 'Khó';
  cookingTime: string;
}


export interface CookingCombo {
  id: string;
  name: string;
  description: string;
  farm: string;
  farmImage: string;
  selectedIngredients: string[]; // Product IDs
  suggestedDishes: ComboDish[];
  price: number;
  image: string;
  rating: number;
  soldCount: number;
  createdDate: string;
}


// Build Plan Types
export interface BuildPlanRequest {
  planName: string;
  numberOfPeople: number;
  numberOfDays: number;
  mealType: string;
  targetBudget: number;
}

export interface MealItemRequest {
  comboId: number;
  quantity: number;
}

export interface MealRequest {
  mealType: string;
  items: MealItemRequest[];
}

export interface PlanDayRequest {
  dayIndex: number;
  meals: MealRequest[];
}

export interface BuildPlanDetailRequest {
  plan: BuildPlanRequest;
  days: PlanDayRequest[];
}

export interface MealItemResponse {
  id: number;
  quantity: number;
  combo: {
    id: number;
    comboName: string;
    discountPrice: number;
    description: string;
    type: string;
    mealType?: string;
    items?: any[];
    shopOwnerId?: number;
  };
}

export interface MealResponse {
  id: number;
  mealType: string;
  items: MealItemResponse[];
}

export interface PlanDayResponse {
  id: number;
  dayIndex: number;
  meals: MealResponse[];
}

export interface BuildPlanResponse {
  id: number;
  planName: string;
  numberOfPeople: number;
  numberOfDays: number;
  mealType: string;
  targetBudget: number;
  days: PlanDayResponse[];
}
export enum BlogCategory {
  SUC_KHOE = 'SUC_KHOE',
  CAM_NANG = 'CAM_NANG',
  NHA_NONG = 'NHA_NONG',
  XU_HUONG = 'XU_HUONG'
}

export const BlogCategoryLabel: Record<BlogCategory, string> = {
  [BlogCategory.SUC_KHOE]: 'Sức khỏe',
  [BlogCategory.CAM_NANG]: 'Cẩm nang',
  [BlogCategory.NHA_NONG]: 'Nhà nông',
  [BlogCategory.XU_HUONG]: 'Xu hướng',
};

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
