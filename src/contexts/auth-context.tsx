'use client';

import { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: string;
  googleLinked: boolean;
  hasPassword: boolean;
}

interface AuthContextValue {
  user: UserInfo | null;
  isAdmin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  logout: () => {},
});

function buildUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  if (!authService.isAuthenticated()) return null;
  const info = authService.getUserInfo();
  if (!info) return null;
  return {
    id: info.id || '',
    username: info.username || '',
    email: info.email || '',
    role: info.role || '',
    googleLinked: info.googleLinked,
    hasPassword: info.hasPassword,
  };
}


let cachedSnapshot: UserInfo | null = null;
let cachedSerialized = '__uninitialized__';

function readUser(): UserInfo | null {
  const next = buildUser();
  const serialized = JSON.stringify(next);
  if (serialized !== cachedSerialized) {
    cachedSerialized = serialized;
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

const subscribe = () => () => {};
const getServerSnapshot = (): UserInfo | null => null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const user = useSyncExternalStore(subscribe, readUser, getServerSnapshot);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const logout = () => {
    authService.logout();
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'ADMIN', logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
