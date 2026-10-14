import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiClient,
  getApiBaseUrl,
  getBackendMode,
  setBackendMode,
  BackendMode,
  isMixedContentRisk,
} from '../api/client';
import { User, AuthLoginResponse, AuthRegisterResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<AuthRegisterResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  backendStatus: 'healthy' | 'offline' | 'checking';
  checkBackendStatus: () => Promise<boolean>;
  apiBaseUrl: string;
  backendMode: BackendMode;
  setMode: (mode: BackendMode) => void;
  quickDemoLogin: () => Promise<void>;
  hasMixedContentRisk: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendMode, setBackendModeState] = useState<BackendMode>(getBackendMode());
  const [backendStatus, setBackendStatus] = useState<'healthy' | 'offline' | 'checking'>(
    getBackendMode() === 'mock' ? 'healthy' : 'checking'
  );
  const [apiBaseUrl] = useState<string>(getApiBaseUrl());

  const checkBackendStatus = useCallback(async (): Promise<boolean> => {
    if (backendMode === 'mock') {
      setBackendStatus('healthy');
      return true;
    }

    try {
      setBackendStatus('checking');
      await apiClient.get('/auth/me');
      setBackendStatus('healthy');
      return true;
    } catch (err: any) {
      if (err.response?.status === 401) {
        setBackendStatus('healthy');
        return true;
      }
      setBackendStatus('offline');
      return false;
    }
  }, [backendMode]);

  const refreshUser = useCallback(async () => {
    const storedToken = localStorage.getItem('access_token');
    if (!storedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient.get<User>('/auth/me');
      setUser(res.data);
      setBackendStatus('healthy');
    } catch (error) {
      console.warn('Failed to fetch user with current token:', error);
      if ((error as any).response?.status === 401) {
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    checkBackendStatus();

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    const handleModeChanged = (e: any) => {
      setBackendModeState(e.detail);
      if (e.detail === 'mock') {
        setBackendStatus('healthy');
      } else {
        checkBackendStatus();
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('backend:mode-changed', handleModeChanged);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('backend:mode-changed', handleModeChanged);
    };
  }, [refreshUser, checkBackendStatus]);

  const setMode = (newMode: BackendMode) => {
    setBackendMode(newMode);
    setBackendModeState(newMode);
    if (newMode === 'mock') {
      setBackendStatus('healthy');
    } else {
      checkBackendStatus();
    }
  };

  const login = async (email: string, password: string) => {
    const res = await apiClient.post<AuthLoginResponse>('/auth/login', { email, password });
    const accessToken = res.data.access_token;
    localStorage.setItem('access_token', accessToken);
    setToken(accessToken);

    try {
      const userRes = await apiClient.get<User>('/auth/me');
      setUser(userRes.data);
    } catch {
      setUser({ id: 'user-auth', name: email.split('@')[0], email });
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await apiClient.post<AuthRegisterResponse>('/auth/register', { name, email, password });
    return res.data;
  };

  const quickDemoLogin = async () => {
    setMode('mock');
    await login('engineer@workspace.dev', 'workspace123');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        backendStatus,
        checkBackendStatus,
        apiBaseUrl,
        backendMode,
        setMode,
        quickDemoLogin,
        hasMixedContentRisk: isMixedContentRisk(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
