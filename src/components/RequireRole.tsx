'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { UserRole } from '@/types';

interface RequireRoleProps {
  allow: UserRole[] | readonly UserRole[];
  children: React.ReactNode;
}

export function RequireRole({ allow, children }: RequireRoleProps) {
  const { user } = useAuth();
  const router = useRouter();
  const allowedRoles = allow as readonly string[];
  const isAllowed = !!user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, router, allowedRoles]);

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600">Anda tidak memiliki izin untuk membuka halaman ini.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
