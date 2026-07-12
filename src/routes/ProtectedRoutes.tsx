
import React from 'react';
import { Route, useNavigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Cart from '../pages/auth/Cart';
import Checkout from '../pages/auth/Checkout';
import Success from '../pages/auth/Success';
import Tracking from '../pages/auth/Tracking';
import MyOrders from '../pages/auth/MyOrders';
import OrderDetail from '../pages/auth/OrderDetail';
import MyVouchers from '../pages/auth/MyVouchers';
import MyReturns from '../pages/auth/MyReturns';
import UserProfile from '../pages/auth/UserProfile';
import Wallet from '../pages/auth/Wallet';
import KYC from '../pages/auth/KYC';
import MealPlan from '../pages/auth/MealPlan';
import { AppRole } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoutes = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleCheckoutBack = () => {
        navigate('/cart', { state: { refreshCartAt: Date.now() } });
    };

    return (
        <>
            <Route path="/cart" element={
                <ProtectedRoute>
                    <Cart
                        onProceedToCheckout={(keys) => navigate('/checkout', { state: { selectedKeys: keys } })}
                        onBackToShopping={() => navigate('/')}
                        onNavigateToOrders={() => navigate('/my-orders')}
                    />
                </ProtectedRoute>
            } />
            <Route path="/checkout" element={
                <ProtectedRoute>
                    <Checkout
                        onComplete={(id, orderIds) => {
                          const qs = orderIds && orderIds.length > 1
                            ? `orderId=${id}&orderIds=${orderIds.join(',')}`
                            : `orderId=${id}`;
                          navigate(`/success?${qs}`);
                        }}
                        onBack={handleCheckoutBack}
                    />
                </ProtectedRoute>
            } />
            <Route path="/success" element={
                <ProtectedRoute>
                    <Success onViewMyOrders={() => navigate('/my-orders')} onGoHome={() => navigate('/')} orderId={0} />
                </ProtectedRoute>
            } />
            <Route path="/tracking/:orderId" element={
                <ProtectedRoute>
                    <Tracking onBack={() => navigate(-1)} orderId={0} />
                </ProtectedRoute>
            } />
            <Route path="/my-orders/:orderId" element={
                <ProtectedRoute>
                    <OrderDetail />
                </ProtectedRoute>
            } />
            <Route path="/my-orders" element={
                <ProtectedRoute>
                    <MyOrders
                        onBack={() => navigate('/')}
                        onViewTracking={(id) => navigate(`/tracking/${id}`)}
                    />
                </ProtectedRoute>
            } />
            <Route path="/my-vouchers" element={
                <ProtectedRoute allowedRoles={[AppRole.BUYER]}>
                    <MyVouchers />
                </ProtectedRoute>
            } />
            <Route path="/my-returns" element={
                <ProtectedRoute>
                    <MyReturns />
                </ProtectedRoute>
            } />
            <Route path="/profile" element={
                <ProtectedRoute>
                    <UserProfile />
                </ProtectedRoute>
            } />
            <Route path="/wallet" element={
                <ProtectedRoute>
                    <Wallet />
                </ProtectedRoute>
            } />
            <Route path="/meal-plan" element={
                <ProtectedRoute allowedRoles={[AppRole.BUYER]}>
                    <MealPlan />
                </ProtectedRoute>
            } />
            <Route path="/kyc" element={
                <ProtectedRoute allowedRoles={[AppRole.FARMER, AppRole.SHIPPER]}>
                    <KYCRouteWrapper />
                </ProtectedRoute>
            } />
        </>
    );
};

// Component con để xử lý logic lấy role/user cho KYC
const KYCRouteWrapper = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Ưu tiên role từ state nếu đang trong luồng redirect đăng ký/đăng nhập
    const stateRole = location.state?.pendingUser?.role;
    const effectiveRole = user?.role || stateRole || AppRole.FARMER;
    const roleForKYC = effectiveRole === AppRole.SHIPPER ? 'SHIPPER' : 'FARMER';

    return (
        <KYC
            onComplete={() => navigate('/')}
            onBack={() => navigate('/')}
            role={roleForKYC}
            user={user}
        />
    );
};

export default ProtectedRoutes;
