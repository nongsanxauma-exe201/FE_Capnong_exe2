
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services';
import { AppRole, User, KYCStatus } from '../types';

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    login: (role: AppRole) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    setIsAuthenticated: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserInfo = async () => {
        if (isAuthenticated) {
            try {
                const response = await authService.getMyInfo();
                if (response.result) {
                    const userData = response.result;
                    const backendRole = userData.role.name;
                    const accountRole = backendRole === 'SHOP_OWNER' ? AppRole.FARMER :
                        (backendRole === 'SHIPPER' ? AppRole.SHIPPER :
                            (backendRole === 'ADMIN' ? AppRole.ADMIN :
                                (backendRole === 'STAFF' ? AppRole.STAFF : AppRole.BUYER)));

                    const mappedUser: User = {
                        id: userData.id.toString(),
                        name: userData.fullName,
                        email: userData.email,
                        role: accountRole,
                        kycStatus: userData.status === 'PENDING' ? KYCStatus.PENDING : (userData.status === 'ACTIVE' ? KYCStatus.APPROVED : KYCStatus.REJECTED),
                        avatar: userData.logoUrl || userData.profileImageUrl || (accountRole === AppRole.FARMER ? 'https://picsum.photos/seed/farmer_ba/100/100' : 'https://picsum.photos/seed/app_avatar/100/100'),
                        phone: userData.phoneNumber,
                        address: userData.address,
                        shopName: userData.shopName,
                        bankAccount: userData.bankAccount,
                        description: userData.description,
                        achievement: userData.achievement
                    };
                    setUser(mappedUser);
                }
            } catch (error) {
                console.error("Failed to fetch user info:", error);
                if (authService.getToken()) {
                    logout();
                }
            } finally {
                setLoading(false);
            }
        } else {
            setUser(null);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserInfo();
    }, [isAuthenticated]);

    const login = (role: AppRole) => {
        setIsAuthenticated(true);
    };

    const logout = () => {
        authService.logout();
        setIsAuthenticated(false);
        setUser(null);
    };

    const refreshUser = async () => {
        await fetchUserInfo();
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, refreshUser, setIsAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
