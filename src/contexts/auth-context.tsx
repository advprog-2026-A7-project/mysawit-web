'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

function readUser(): UserInfo | null {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Start as null on both server and client to avoid hydration mismatch.
  // localStorage is only available on the client, so we hydrate the user
  // after mount.
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    setUser(readUser());
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
