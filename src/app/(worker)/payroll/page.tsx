'use client';

import { useEffect, useState } from 'react';
import { payrollService } from '@/services/payroll.service';
import { authService } from '@/services/auth.service';
import { Payroll } from '@/types';
import { Filter, RefreshCw } from 'lucide-react';

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

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
  PAID: 'Dibayar',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge badge-yellow',
  APPROVED: 'badge badge-blue',
  ACCEPTED: 'badge badge-purple',
  REJECTED: 'badge badge-red',
  PAID: 'badge badge-green',
};

export default function WorkerPayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    status: '',
  });

  const userInfo = authService.getUserInfo();

  const fetchPayrolls = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError('');
      if (!userInfo?.id) return;

      try {
        const data = await payrollService.getAll({
          userId: String(userInfo.id),
          from: nextFilters.from || undefined,
          to: nextFilters.to || undefined,
          status: nextFilters.status || undefined,
        });
        setPayrolls(data);
      } catch {
        const data = await payrollService.getAll();
        const myPayrolls = data.filter(p => String(p.userId) === String(userInfo.id));
        setPayrolls(myPayrolls);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat slip gaji');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls({ from: '', to: '', status: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.id]);

  const handleFilter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filters.from && filters.to && filters.to < filters.from) {
      setError('Tanggal akhir tidak boleh sebelum tanggal mulai');
      return;
    }
    await fetchPayrolls(filters);
  };

  const handleResetFilter = async () => {
    const emptyFilters = { from: '', to: '', status: '' };
    setFilters(emptyFilters);
    await fetchPayrolls(emptyFilters);
  };

  const handleAccept = async (id: string | number) => {
    try {
      const accepted = await payrollService.accept(Number(id));
      setPayrolls(prev => prev.map(p => p.id === id ? accepted : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menerima gaji');
    }
  };

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-3xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          Memuat slip gaji Anda...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-3xl mx-auto">
      <header>
        <p className="page-eyebrow">Penghasilan</p>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Slip Gaji Saya</h1>
        <p className="text-slate-400 mt-1 text-sm">Daftar slip gaji Anda yang diterbitkan oleh perusahaan.</p>
      </header>

      {error && <div className="alert-error"><span>{error}</span></div>}

      <section className="surface-panel p-4">
        <form onSubmit={handleFilter} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
          <div>
            <label className="label-sm">Tanggal Mulai</label>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
              className="ms-input"
            />
          </div>
          <div>
            <label className="label-sm">Tanggal Akhir</label>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
              className="ms-input"
            />
          </div>
          <div>
            <label className="label-sm">Status</label>
            <select
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              className="ms-input"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="ACCEPTED">Diterima</option>
              <option value="APPROVED">Disetujui</option>
              <option value="PAID">Dibayar</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1 justify-center">
              <Filter size={15} aria-hidden="true" />Filter
            </button>
            <button type="button" onClick={handleResetFilter} className="btn-ghost justify-center">
              <RefreshCw size={15} aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>

      {payrolls.length === 0 ? (
        <div className="empty-state">
          <h3 className="text-lg font-bold text-white mb-2">Belum ada slip gaji</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Anda belum memiliki catatan slip gaji. Slip gaji biasanya diterbitkan oleh Mandor atau Admin pada periode tertentu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {payrolls.map((payroll) => (
            <div key={payroll.id} className="surface-panel overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {formatDate(payroll.periodStart)} — {formatDate(payroll.periodEnd)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">ID: #{payroll.id}</p>
                </div>
                <span className={STATUS_BADGE[payroll.status] || 'badge badge-gray'}>
                  {STATUS_LABEL[payroll.status] || payroll.status}
                </span>
              </div>

              {/* Details */}
              <div className="p-5">
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Gaji Pokok</span>
                    <span className="text-white font-medium">{formatCurrency(payroll.baseAmount)}</span>
                  </div>

                  {payroll.bonusAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Bonus</span>
                      <span className="text-green-400 font-medium">+{formatCurrency(payroll.bonusAmount)}</span>
                    </div>
                  )}

                  {payroll.deductionAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Potongan</span>
                      <span className="text-red-400 font-medium">-{formatCurrency(payroll.deductionAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-lg font-bold pt-4 border-t border-white/[0.06]">
                    <span className="text-white">Total Diterima</span>
                    <span className="text-green-400">{formatCurrency(payroll.totalAmount)}</span>
                  </div>

                  {payroll.paymentMethod && (
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Metode Pembayaran</span>
                      <span>{payroll.paymentMethod.replace('_', ' ')}</span>
                    </div>
                  )}

                  {payroll.notes && (
                    <div className="mt-3 p-3 bg-white/[0.03] border border-white/5 rounded-lg text-sm text-slate-300">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Catatan</span>
                      {payroll.notes}
                    </div>
                  )}
                </div>

                {/* Action */}
                {payroll.status === 'PENDING' && (
                  <button
                    onClick={() => handleAccept(payroll.id)}
                    className="w-full btn-primary bg-green-600 hover:bg-green-500 justify-center py-3"
                  >
                    Konfirmasi Slip Gaji
                  </button>
                )}

                {payroll.status === 'ACCEPTED' && (
                  <div className="w-full bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-center justify-center text-sm font-medium text-green-400">
                    Anda telah mengkonfirmasi penerimaan dana
                  </div>
                )}

                {payroll.status === 'APPROVED' && (
                  <div className="w-full bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex items-center justify-center text-sm text-orange-300">
                    Gaji telah disetujui, menunggu pembayaran dari Admin.
                  </div>
                )}

                {payroll.status === 'PAID' && (
                  <div className="w-full bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-center justify-center text-sm text-blue-300">
                    Dana sudah dibayarkan.
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
