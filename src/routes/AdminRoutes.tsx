import React from 'react';
import { Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminMessages from '../pages/admin/Messages';
import KYCApproval from '../pages/admin/KYCApproval';
import NewsManagement from '../pages/admin/NewsManagement';
import NotificationManagement from '../pages/admin/NotificationManagement';
import ShopMonitoring from '../pages/admin/ShopMonitoring';
import Disputes from '../pages/admin/Disputes';
import ShipperManagement from '../pages/admin/ShipperManagement';
import BadBuyers from '../pages/admin/BadBuyers';
import AdminWallet from '../pages/admin/AdminWallet';
import ProductApproval from '../pages/admin/ProductApproval';
import CodSettlement from '../pages/admin/CodSettlement';
import { AppRole } from '../types';

const AdminRoutes = () => {
    return (
        <Route path="/admin" element={
            <ProtectedRoute allowedRoles={[AppRole.ADMIN]}>
                <AdminLayout />
            </ProtectedRoute>
        }>
            <Route index element={<AdminDashboard />} />
            <Route path="overview" element={<AdminDashboard />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="kyc" element={<KYCApproval />} />
            <Route path="news" element={<NewsManagement />} />
            <Route path="notifications" element={<NotificationManagement />} />
            <Route path="stores" element={<ShopMonitoring />} />
            <Route path="disputes" element={<Disputes />} />
            <Route path="product-approval" element={<ProductApproval />} />
            <Route path="shippers" element={<ShipperManagement />} />
            <Route path="bad-buyers" element={<BadBuyers />} />
            <Route path="wallet" element={<AdminWallet />} />
            <Route path="cod-settlement" element={<CodSettlement />} />
        </Route>
    );
};

export default AdminRoutes;
