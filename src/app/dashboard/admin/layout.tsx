'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
