import React from 'react';
import { Route } from 'react-router-dom';
import StaffLayout from './StaffLayout';
import ProtectedRoute from './ProtectedRoute';
import { AppRole } from '../types';
import StaffDashboard from '../pages/staff/StaffDashboard';
import IncomingOrders from '../pages/staff/IncomingOrders';
import QualityInspection from '../pages/staff/QualityInspection';
import Packing from '../pages/staff/Packing';
import CallShipper from '../pages/staff/CallShipper';
import StaffProfile from '../pages/staff/StaffProfile';

const StaffRoutes = () => {
    return (
        <Route path="/staff" element={
            <ProtectedRoute allowedRoles={[AppRole.STAFF]}>
                <StaffLayout />
            </ProtectedRoute>
        }>
            <Route index element={<StaffDashboard />} />
            <Route path="overview" element={<StaffDashboard />} />
            <Route path="orders" element={<IncomingOrders />} />
            <Route path="incoming" element={<IncomingOrders />} />
            <Route path="inspect" element={<QualityInspection />} />
            <Route path="pack" element={<Packing />} />
            <Route path="shipper" element={<CallShipper />} />
            <Route path="profile" element={<StaffProfile />} />
        </Route>
    );
};

export default StaffRoutes;