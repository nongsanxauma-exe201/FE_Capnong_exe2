
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import OnboardingTour from '../components/OnboardingTour/OnboardingTour';
import { useAuth } from '../contexts/AuthContext';
import { AppRole } from '../types';

const FarmerLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Extract the segment after /farmer/
    const segments = location.pathname.split('/');
    // segments: ['', 'farmer', 'trip-join', '123']
    const farmerIndex = segments.indexOf('farmer');
    const subPath = farmerIndex >= 0 ? segments[farmerIndex + 1] : '';
    const currentPath = !subPath || subPath === 'farmer' ? 'overview' : subPath;

    const handleNavigate = (path: string) => {
        navigate(`/farmer/${path}`);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar
                role={AppRole.FARMER}
                user={user}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                onLogout={logout}
            />
            <main className="flex-1 overflow-y-auto bg-background">
                <Outlet />
            </main>
            <OnboardingTour onNavigate={handleNavigate} />
        </div>
    );
};

export default FarmerLayout;
