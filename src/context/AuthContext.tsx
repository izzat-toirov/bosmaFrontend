import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  apiClient,
  clearAuthTokens,
  getAccessToken,
  setAccessToken,
  setRefreshToken,
} from '../lib/api-client';
import type {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthRegisterRequest,
  AuthRegisterResponse,
  AuthGetProfileResponse,
  User,
} from '../types/api';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  login: (dto: AuthLoginRequest) => Promise<void>;
  register: (dto: AuthRegisterRequest) => Promise<AuthRegisterResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setTokenState] = useState<string | null>(() =>
    getAccessToken(),
  );

  const refreshProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setStatus('unauthenticated');
      return;
    }

    setStatus('loading');
    try {
      const res = await apiClient.get<AuthGetProfileResponse>('/auth/profile');
      setUser(res.data);
      setStatus('authenticated');
    } catch {
      clearAuthTokens();
      setTokenState(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (dto: AuthLoginRequest) => {
    setStatus('loading');
    try {
      const res = await apiClient.post<AuthLoginResponse & { refreshToken?: string }>(
        '/auth/login',
        dto,
      );
      setAccessToken(res.data.accessToken);
      setTokenState(res.data.accessToken);
      setUser(res.data.user);

      if (res.data.refreshToken) {
        setRefreshToken(res.data.refreshToken);
      }

      setStatus('authenticated');
    } catch (e) {
      clearAuthTokens();
      setTokenState(null);
      setUser(null);
      setStatus('unauthenticated');
      throw e;
    }
  }, []);

  const register = useCallback(async (dto: AuthRegisterRequest) => {
    const res = await apiClient.post<AuthRegisterResponse>('/auth/register', dto);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      clearAuthTokens();
      setTokenState(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [status, user, accessToken, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
