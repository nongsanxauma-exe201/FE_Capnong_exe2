
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout';
import AuthRoutes from './AuthRoutes';
import PublicRoutes from './PublicRoutes';
import ProtectedRoutes from './ProtectedRoutes';
import AdminRoutes from './AdminRoutes';
import FarmerRoutes from './FarmerRoutes';
import ShipperRoutes from './ShipperRoutes';
import StaffRoutes from './StaffRoutes';

const AppRouter: React.FC = () => {
    return (
        <Routes>
            {/* MainLayout (Header + Footer) cho mọi trang buyer + auth */}
            <Route element={<MainLayout />}>
                {AuthRoutes()}
                {PublicRoutes()}
                {ProtectedRoutes()}
            </Route>


            {/* Admin, Farmer, Shipper, Staff Routes (layout riêng) */}
            {AdminRoutes()}
            {FarmerRoutes()}
            {ShipperRoutes()}
            {StaffRoutes()}

            {/* Fallback 404 */}
            <Route path="*" element={<div className="p-20 text-center font-bold">404 - Trang không tìm thấy</div>} />
        </Routes>
    );
};

export default AppRouter;
