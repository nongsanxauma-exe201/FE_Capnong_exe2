
import React from 'react';
import { Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { AppRole, KYCStatus } from '../types';
import StaffDashboard from '../pages/staff/StaffDashboard';
const ShipperRoutes = () => {
    return (
        <Route path="/staff" element={
            <ProtectedRoute allowedRoles={[AppRole.STAFF]} requiredStatus={KYCStatus.APPROVED}>
                <StaffDashboard />
            </ProtectedRoute>
        } />
    );
};


export default ShipperRoutes;
