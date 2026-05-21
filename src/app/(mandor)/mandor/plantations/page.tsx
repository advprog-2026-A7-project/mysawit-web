'use client';

import { useCallback, useEffect, useState } from 'react';
import { plantationService } from '@/services/plantation.service';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { Plantation, User } from '@/types';

export default function MandorPlantationsPage() {
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [supirUsers, setSupirUsers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const userInfo = authService.getUserInfo();
      
      let data: Plantation[] = [];
      
      // Try getAll first, if forbidden try getByOwner
      try {
        data = await plantationService.getAll();
      } catch {
        // If forbidden, try fetching by owner (mandor's own id)
        if (userInfo?.id) {
          try {
            data = await plantationService.getByOwner(userInfo.id);
          } catch {
            // If that also fails, show empty state
            data = [];
          }
        }
      }
      
      // Filter to only keep plantations assigned to this mandor
      if (userInfo?.id) {
        const myPlantations = data.filter(p => String(p.mandorId) === String(userInfo.id));
        // If no plantations match, maybe the backend already filtered, use all data
        setPlantations(myPlantations.length > 0 ? myPlantations : data);
      } else {
        setPlantations(data);
      }
      
      // Load user details for supirs
      try {
        const users = await identityService.listUsers();
        const map: Record<string, string> = {};
        users.forEach((u: User) => {
          map[String(u.id)] = u.name || u.username || 'Anggota';
        });
        setSupirUsers(map);
      } catch {
        // Ignore user fetch errors
      }
    } catch (err) { 
      setError(err instanceof Error ? err.message : 'Gagal memuat kebun'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-5xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          Memuat daftar kebun...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-5xl mx-auto">
      <header>
        <p className="page-eyebrow">Area Operasional</p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Kebun Saya</h1>
        <p className="text-slate-400 mt-1 text-sm">Daftar blok kebun dan pekerja yang berada di bawah pengawasan Anda.</p>
      </header>

      {error && <div className="alert-error"><span>{error}</span></div>}

      {plantations.length === 0 && !error ? (
        <div className="empty-state">
          <p className="font-medium text-white text-lg">Belum ada penugasan kebun</p>
          <p className="text-slate-400 text-sm mt-1">Anda belum ditugaskan ke blok kebun manapun oleh Admin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plantations.map(p => (
            <div key={p.id} className="surface-panel overflow-hidden">
              <div className="p-5 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    {p.code && <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded mt-1 inline-block">{p.code}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-300">{p.area}</span>
                    <span className="text-xs text-slate-500 block">Hektare</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mt-2">{p.location}</p>
              </div>
              
              <div className="p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Daftar Supir Truk</h4>
                
                {p.supirIds && p.supirIds.length > 0 ? (
                  <ul className="space-y-2">
                    {p.supirIds.map(supirId => (
                      <li key={supirId} className="flex items-center gap-3 bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
                        <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold">
                          {(supirUsers[String(supirId)]?.[0] || 'S').toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-200 font-medium">{supirUsers[String(supirId)] || 'Supir'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-orange-300">Belum ada supir yang ditugaskan ke kebun ini.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
