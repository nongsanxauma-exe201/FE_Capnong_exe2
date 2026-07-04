
import React from 'react';
import { Route, useNavigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ShipperDashboard from '../pages/shipper/Dashboard';
import { AppRole, KYCStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ShipperRoutes = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <Route path="/shipper" element={
            <ProtectedRoute allowedRoles={[AppRole.SHIPPER]} requiredStatus={KYCStatus.APPROVED}>
                <ShipperDashboard onLogout={handleLogout} />
            </ProtectedRoute>
        } />
    );
};


export default ShipperRoutes;
