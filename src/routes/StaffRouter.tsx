
import React from 'react';
import { Route, useNavigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ShipperDashboard from '../pages/shipper/Dashboard';
import { AppRole, KYCStatus } from '../types';
import { authService } from '../services';
import StaffDashboard from '../pages/staff/StaffDashboard';

const ShipperRoutes = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    return (
        <Route path="/staff" element={
            <ProtectedRoute allowedRoles={[AppRole.STAFF]} requiredStatus={KYCStatus.APPROVED}>
                <StaffDashboard onLogout={handleLogout} />
            </ProtectedRoute>
        } />
    );
};


export default ShipperRoutes;
