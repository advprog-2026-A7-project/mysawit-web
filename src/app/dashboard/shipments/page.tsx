'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, AlertCircle } from 'lucide-react';

import { shipmentService } from '@/services/shipment.service';
import { authService } from '@/services/auth.service';
import { API_ENDPOINTS } from '@/lib/api-config';
import { AuthResponse, Shipment } from '@/types';

import AdminShipmentView from './views/AdminShipmentView';
import MandorShipmentView from './views/MandorShipmentView';
import SupirShipmentView from './views/SupirShipmentView';

const isUnauthorizedError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes('unauthorized');

const refreshAuthSession = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(API_ENDPOINTS.AUTH.REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const authResponse = await response.json() as AuthResponse;
    authService.saveAuth(authResponse);
    return true;
  } catch {
    return false;
  }
};

export default function ShipmentsPage() {
  const router = useRouter();
  const routerRef = useRef(router);
  const userInfo = authService.getUserInfo();
  const userRole = userInfo?.role;

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      let data: Shipment[];

      try {
        data = await shipmentService.getAll();
      } catch (err) {
        if (!isUnauthorizedError(err)) throw err;

        const refreshed = await refreshAuthSession();
        if (!refreshed) {
          authService.logout();
          routerRef.current.push('/login');
          throw new Error('Unauthorized');
        }

        try {
          data = await shipmentService.getAll();
        } catch (retryErr) {
          if (isUnauthorizedError(retryErr)) {
            authService.logout();
            routerRef.current.push('/login');
            throw new Error('Unauthorized');
          }
          throw retryErr;
        }
      }

      setShipments(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengiriman');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userRole) return;
    
    // Buruh doesn't have access to Shipments
    if (userRole === 'BURUH') {
      router.push('/dashboard');
      return;
    }

    void loadShipments();
  }, [loadShipments, userRole, router]);

  if (!userRole) {
    return (
      <div className="surface-panel bg-white p-8 text-center text-sm text-slate-500">
        <Clock3 size={20} aria-hidden="true" className="mx-auto mb-3 animate-spin text-slate-500" />
        Memverifikasi akses...
      </div>
    );
  }

  if (userRole === 'BURUH') {
    return null; // Will redirect in useEffect
  }

  // Dispatch to the correct view based on Role
  if (userRole === 'ADMIN') {
    return <AdminShipmentView shipments={shipments} loading={loading} error={error} onRefresh={loadShipments} />;
  }

  if (userRole === 'MANDOR') {
    return <MandorShipmentView shipments={shipments} loading={loading} error={error} onRefresh={loadShipments} />;
  }

  if (userRole === 'SUPIR') {
    return <SupirShipmentView shipments={shipments} loading={loading} error={error} onRefresh={loadShipments} />;
  }

  // Fallback for unknown roles
  return (
    <div className="alert-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>Peran pengguna tidak dikenali. Akses ditolak.</span>
    </div>
  );
}
