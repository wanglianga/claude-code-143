import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

interface AuthState {
  user: any;
  workerProfile: any;
  enterpriseProfile: any;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [enterpriseProfile, setEnterpriseProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data: any = await api.get('/auth/me');
      setUser(data.user);
      setWorkerProfile(data.workerProfile || null);
      setEnterpriseProfile(data.enterpriseProfile || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, workerProfile, enterpriseProfile, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
