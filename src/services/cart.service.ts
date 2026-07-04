import { httpClient as api, ApiResponse } from './http.client';

export interface AddCartItemRequest {
    productId?: number;
    mysteryBoxId?: number;
    buildComboId?: number;
    quantity?: number;
    quantityKg?: number;
}

export interface CartItemResponse {
    productId?: number;
    mysteryBoxId?: number;
    buildComboId?: number;
    productName: string;
    quantity: number;
    quantityKg?: number;
    price: number;
    pricePerKg?: number;
    itemTotal?: number;
    stockKg?: number;
    imageUrl?: string;
    shopName?: string;
    itemType: 'PRODUCT' | 'MYSTERY_BOX' | 'BUILD_COMBO' | 'COMBO';
    shopOwnerId?: number;
    discountPercent?: number;
    salePrice?: number;
}

export interface CartResponse {
    items: CartItemResponse[];
    totalAmount: number;
}

export const cartService = {
    getCart: async (): Promise<ApiResponse<CartResponse>> => {
        return await api.get<CartResponse>(`/cart?_=${Date.now()}`);
    },

    addToCart: async (data: AddCartItemRequest): Promise<ApiResponse<CartResponse>> => {
        return await api.post<CartResponse>('/cart/add', data);
    },

    updateQuantity: async (productId: number, quantity: number): Promise<ApiResponse<CartResponse>> => {
        return await api.put<CartResponse>(`/cart/quantity?productId=${productId}&quantity=${quantity}`);
    },

    updateMysteryBoxQuantity: async (mysteryBoxId: number, quantity: number): Promise<ApiResponse<CartResponse>> => {
        return await api.put<CartResponse>(`/cart/mystery-box/quantity?mysteryBoxId=${mysteryBoxId}&quantity=${quantity}`);
    },

    updateComboQuantity: async (buildComboId: number, quantity: number): Promise<ApiResponse<CartResponse>> => {
        return await api.put<CartResponse>(`/cart/build-combo/quantity?comboId=${buildComboId}&quantity=${quantity}`);
    },

    removeItem: async (productId: number): Promise<ApiResponse<string>> => {
        return await api.delete<string>(`/cart/item/${productId}`);
    },

    removeMysteryBox: async (mysteryBoxId: number): Promise<ApiResponse<string>> => {
        return await api.delete<string>(`/cart/mystery-box/${mysteryBoxId}`);
    },

    removeCombo: async (buildComboId: number): Promise<ApiResponse<string>> => {
        return await api.delete<string>(`/cart/build-combo/${buildComboId}`);
    },

    clearCart: async (): Promise<ApiResponse<string>> => {
        return await api.delete<string>('/cart/clear');
    },

    addPlanToCart: async (planId: number): Promise<ApiResponse<CartResponse>> => {
        return await api.post<CartResponse>(`/cart/add-plan/${planId}`);
    }
};

/** Báo cho Header + trang Cart refetch giỏ hàng ngay lập tức */
export function notifyCartUpdated() {
    window.dispatchEvent(new Event('cart-updated'));
}