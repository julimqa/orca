import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../api/types';
import { clearAuthStorage, loadStoredUser, persistUser } from './auth.storage';
import { getCurrentUser } from '../api/auth.api';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = loadStoredUser();
    if (storedUser) {
      setUserState(storedUser);
      setIsLoading(false);
      return;
    }

    const hasSessionCookie = document.cookie.includes('access_token=');
    if (hasSessionCookie) {
      getCurrentUser()
        .then((response) => {
          if (response?.success && response.user) {
            setUserState(response.user);
            persistUser(response.user);
            return;
          }
          clearAuthStorage();
          setUserState(null);
        })
        .catch(() => {
          clearAuthStorage();
          setUserState(null);
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        })
        .finally(() => setIsLoading(false));
      return;
    }

    setIsLoading(false);
  }, []);

  const setUser = (user: User | null) => {
    setUserState(user);
    persistUser(user);
  };

  const logout = () => {
    clearAuthStorage();
    setUserState(null);
  };

  const value = {
    user,
    setUser,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
