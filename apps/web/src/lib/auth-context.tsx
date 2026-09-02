'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RoleCode } from '@amatis/types';
import { api } from '@/lib/api';

export interface AuthUser {
  id: string;
  mobile: string;
  roles: RoleCode[];
  mustChangePassword: boolean;
  employeeProfile?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    position?: string;
    avatarUrl?: string;
    email?: string;
    age?: number | null;
    gender?: string | null;
    maritalStatus?: string | null;
    skillLevel?: string;
    collaborationType?: string;
    collaborationStatus?: string;
    startDate?: string | null;
    supervisor?: { id: string; firstName: string; lastName: string } | null;
    primaryProject?: { id: string; name: string; code?: string } | null;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: RoleCode[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        return;
      }
      const response = await api.get<{ success: boolean; data: AuthUser }>('/auth/me');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch {
      setUser(null);
      api.clearTokens();
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          /* ignore */
        }
      }
      await refreshUser();
      setIsLoading(false);
    };
    init();
  }, [refreshUser]);

  const login = async (mobile: string, password: string) => {
    const response = await api.post<{
      success: boolean;
      data: {
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      };
    }>('/auth/login', { mobile, password });

    api.setTokens(response.data.accessToken, response.data.refreshToken);
    setUser(response.data.user);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    if (response.data.user.mustChangePassword) {
      router.push('/change-password');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {
      /* ignore */
    }
    api.clearTokens();
    setUser(null);
    router.push('/login');
  };

  const hasRole = (...roles: RoleCode[]) => {
    if (!user) return false;
    return roles.some((role) => user.roles.includes(role));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
