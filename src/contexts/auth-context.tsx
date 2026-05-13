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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const info = authService.getUserInfo();
    if (info) {
      setUser({
        id: info.id || '',
        username: info.username || '',
        email: info.email || '',
        role: info.role || '',
        googleLinked: info.googleLinked,
        hasPassword: info.hasPassword,
      });
    }
    setChecked(true);
  }, [router]);

  const logout = () => {
    authService.logout();
    router.push('/');
  };

  if (!checked) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'ADMIN', logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
