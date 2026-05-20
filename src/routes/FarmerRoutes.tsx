import React from 'react';
import { Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import FarmerLayout from './FarmerLayout';
import ProtectedRoute from './ProtectedRoute';
import FarmerDashboard from '../pages/farmer/Dashboard';
import Products from '../pages/farmer/Products';
import AddProduct from '../pages/farmer/AddProduct';
import EditProduct from '../pages/farmer/EditProduct';
import MysteryBoxEditor from '../pages/farmer/MysteryBoxEditor';
import FarmerNotifications from '../pages/farmer/Notifications';
import Reviews from '../pages/farmer/Reviews';
import Tracking from '../pages/auth/Tracking';
import AdminMessages from '../pages/admin/Messages';
import Orders from '../pages/farmer/Orders';
import OrderPreparation from '../pages/farmer/OrderPreparation';
import Wallet from '../pages/farmer/Wallet';
import Profile from '../pages/farmer/Profile';
import Vehicles from '../pages/farmer/Vehicles';
import FarmerDisputes from '../pages/farmer/FarmerDisputes';
import { AppRole, KYCStatus } from '../types';
// ── Wrapper components ──────────────────────────────────────────────────────

const DashboardWrapper = () => {
    const navigate = useNavigate();
    return <FarmerDashboard onNavigate={(path) => navigate(`/farmer/${path}`)} />;
};

const ProductsWrapper = () => {
    const navigate = useNavigate();
    return <Products onNavigate={(path) => navigate(`/farmer/${path}`)} />;
};

const AddProductWrapper = () => {
    const navigate = useNavigate();
    return <AddProduct onBack={() => navigate('/farmer/products')} />;
};

const EditProductWrapper = () => {
    const navigate = useNavigate();
    const { productId } = useParams();
    if (!productId) return <Navigate to="/farmer/products" replace />;
    return <EditProduct productId={Number(productId)} onBack={() => navigate('/farmer/products')} />;
};

const MysteryBoxEditorWrapper = () => {
    const navigate = useNavigate();
    return <MysteryBoxEditor onBack={() => navigate('/farmer/products')} />;
};

const VehiclesWrapper = () => {
    const navigate = useNavigate();
    return <Vehicles onNavigate={(path) => navigate(`/farmer/${path}`)} />;
};

const OrdersWrapper = () => {
    const navigate = useNavigate();
    return <Orders onPrepareOrder={(id) => navigate(`/farmer/order-prep/${id}`)} />;
};

const OrderPreparationWrapper = () => {
    const navigate = useNavigate();
    const { orderId } = useParams();
    if (!orderId) return <Navigate to="/farmer/orders" replace />;
    return (
        <OrderPreparation
            orderId={orderId}
            onBack={() => navigate('/farmer/orders')}
            onComplete={() => navigate('/farmer/orders')}
        />
    );
};

const TrackingWrapper = () => {
    const navigate = useNavigate();
    return <Tracking onBack={() => navigate(-1)} viewerRole="SHOP_OWNER" />;
};

// ── FarmerRoutes ────────────────────────────────────────────────────────────

const FarmerRoutes = () => {
    return (
        <Route
            path="/farmer"
            element={
                <ProtectedRoute allowedRoles={[AppRole.FARMER]} requiredStatus={KYCStatus.APPROVED}>
                    <FarmerLayout />
                </ProtectedRoute>
            }
        >
            <Route index element={<DashboardWrapper />} />
            <Route path="overview" element={<DashboardWrapper />} />
            <Route path="products" element={<ProductsWrapper />} />
            <Route path="add-product" element={<AddProductWrapper />} />
            <Route path="edit-product/:productId" element={<EditProductWrapper />} />
            <Route path="mystery-box-editor" element={<MysteryBoxEditorWrapper />} />
            <Route path="mystery-box-editor/:boxId" element={<MysteryBoxEditorWrapper />} />
            <Route path="vehicles" element={<VehiclesWrapper />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="orders" element={<OrdersWrapper />} />
            <Route path="order-prep/:orderId" element={<OrderPreparationWrapper />} />
            <Route path="notifications" element={<FarmerNotifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="blind-box" element={<Navigate to="/farmer/mystery-box-editor" replace />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="tracking/:orderId" element={<TrackingWrapper />} />
            <Route path="farmer-disputes" element={<FarmerDisputes />} />
            <Route path="messages" element={<AdminMessages />} />
        </Route>
    );
};

export default FarmerRoutes;