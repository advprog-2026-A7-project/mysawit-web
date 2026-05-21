'use client';

import { useEffect, useMemo, useState } from 'react';
import { payrollService } from '@/services/payroll.service';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { Payroll, User } from '@/types';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge badge-yellow',
  APPROVED: 'badge badge-blue',
  ACCEPTED: 'badge badge-purple',
  REJECTED: 'badge badge-red',
  PAID: 'badge badge-green',
  CANCELLED: 'badge badge-gray',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
  PAID: 'Dibayar',
  CANCELLED: 'Dibatalkan',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function MandorPayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterType, setFilterType] = useState<'ALL' | 'MINE' | 'SUBORDINATE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const userInfo = authService.getUserInfo();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const data = await payrollService.getAll();
        
        try {
          const users = await identityService.listUsers();
          const map: Record<string, User> = {};
          users.forEach((u) => { map[String(u.id)] = u; });
          setUsersMap(map);
        } catch {
          // Ignore
        }
        
        setPayrolls(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data slip gaji');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const handleAction = async (id: string | number, action: 'APPROVE' | 'REJECT', reason?: string) => {
    try {
      if (action === 'APPROVE') {
        await payrollService.approve(Number(id));
      } else {
        await payrollService.reject(Number(id), reason);
      }
      const data = await payrollService.getAll();
      setPayrolls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Gagal melakukan aksi ${action}`);
    }
  };

  const filteredPayrolls = useMemo(() => {
    let result = payrolls;
    if (filterStatus) {
      result = result.filter(p => p.status === filterStatus);
    }
    if (filterType === 'MINE') {
      result = result.filter(p => String(p.userId) === String(userInfo?.id));
    } else if (filterType === 'SUBORDINATE') {
      result = result.filter(p => String(p.userId) !== String(userInfo?.id));
    }
    return result;
  }, [payrolls, filterStatus, filterType, userInfo?.id]);

  const stats = useMemo(() => {
    const mine = payrolls.filter(p => String(p.userId) === String(userInfo?.id));
    const sub = payrolls.filter(p => String(p.userId) !== String(userInfo?.id));
    
    return {
      myTotal: mine.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.totalAmount, 0),
      pendingValidation: sub.filter(p => p.status === 'PENDING').length
    };
  }, [payrolls, userInfo?.id]);

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-5xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          Memuat slip gaji...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-5xl mx-auto">
      <header>
        <p className="page-eyebrow">Keuangan Lapangan</p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Validasi Gaji</h1>
        <p className="text-slate-400 mt-1 text-sm">Pantau slip gaji Anda sendiri dan lakukan validasi untuk supir dan buruh.</p>
      </header>

      {error && <div className="alert-error"><span>{error}</span></div>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-panel p-5">
          <p className="text-sm text-slate-400 mb-1">Gaji Saya (Dibayarkan)</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(stats.myTotal)}</p>
        </div>
        <div className="surface-panel p-5">
          <p className="text-sm text-slate-400 mb-1">Menunggu Validasi Anda</p>
          <p className="text-2xl font-bold text-white">{stats.pendingValidation} <span className="text-sm font-normal text-slate-400">pengajuan</span></p>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-panel p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {(['ALL', 'MINE', 'SUBORDINATE'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === type ? 'bg-green-600 text-white' : 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.1]'
              }`}
            >
              {type === 'ALL' ? 'Semua' : type === 'MINE' ? 'Slip Saya' : 'Bawahan'}
            </button>
          ))}
        </div>
        
        <select 
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="ms-input min-w-[180px]"
        >
          <option value="">Semua Status</option>
          <option value="PENDING">Menunggu Validasi</option>
          <option value="APPROVED">Menunggu Bayar</option>
          <option value="PAID">Lunas</option>
          <option value="REJECTED">Ditolak</option>
        </select>
      </div>

      {filteredPayrolls.length === 0 ? (
        <div className="empty-state">
          <p className="font-medium text-white text-lg">Belum ada data slip gaji</p>
          <p className="text-slate-400 text-sm mt-1">Data gaji belum di-generate atau tidak cocok dengan filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPayrolls.map(payroll => {
            const isMine = String(payroll.userId) === String(userInfo?.id);
            const targetUser = usersMap[String(payroll.userId)];
            
            return (
              <div key={payroll.id} className={`surface-panel overflow-hidden ${isMine ? 'border-blue-500/20' : ''}`}>
                {/* Header */}
                <div className="p-5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {isMine ? (
                        <span className="text-xs font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded uppercase tracking-wider">Milik Anda</span>
                      ) : (
                        <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">{targetUser?.role || 'Bawahan'}</span>
                      )}
                    </div>
                    <span className={STATUS_BADGE[payroll.status] || 'badge badge-gray'}>
                      {STATUS_LABEL[payroll.status] || payroll.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {isMine ? (userInfo?.username || 'Anda') : (targetUser?.name || targetUser?.username || `User ${payroll.userId}`)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Periode: {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}</p>
                </div>
                
                {/* Body */}
                <div className="p-5">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Gaji Pokok</span>
                      <span className="text-slate-200">{formatCurrency(payroll.baseAmount)}</span>
                    </div>
                    {payroll.bonusAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Bonus</span>
                        <span className="text-green-400">+{formatCurrency(payroll.bonusAmount)}</span>
                      </div>
                    )}
                    {payroll.deductionAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Potongan</span>
                        <span className="text-red-400">-{formatCurrency(payroll.deductionAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-3 mt-2 border-t border-white/[0.06]">
                      <span className="text-white">Total</span>
                      <span className="text-green-400">{formatCurrency(payroll.totalAmount)}</span>
                    </div>
                  </div>

                  {!isMine && payroll.status === 'PENDING' && (
                    <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
                      <button 
                        onClick={() => handleAction(payroll.id, 'APPROVE')}
                        className="flex-1 btn-primary bg-green-600 hover:bg-green-500 justify-center"
                      >
                        Validasi
                      </button>
                      <button 
                        onClick={() => {
                          const reason = prompt('Masukkan alasan penolakan gaji:');
                          if (reason !== null) handleAction(payroll.id, 'REJECT', reason);
                        }}
                        className="flex-1 btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10 justify-center"
                      >
                        Tolak
                      </button>
                    </div>
                  )}
                  
                  {isMine && payroll.status === 'PENDING' && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-center text-sm text-orange-300 mt-2">
                      Menunggu Persetujuan Admin
                    </div>
                  )}
                  
                  {payroll.status === 'APPROVED' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-center text-sm text-blue-300 mt-2">
                      Menunggu Pencairan dari Admin
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
