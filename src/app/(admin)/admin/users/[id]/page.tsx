'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminService } from '@/services/admin.service';
import { payrollService } from '@/services/payroll.service';
import type { Payroll, UserDetailResponse } from '@/types';
import { Filter, RefreshCw } from 'lucide-react';

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  MANDOR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  BURUH: 'bg-green-500/10 text-green-400 border-green-500/20',
  SUPIR: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const payrollStatusLabel: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
  PAID: 'Dibayar',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="border-b border-white/[0.06] py-3 last:border-0">
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-200 break-words">{value || '-'}</dd>
    </div>
  );
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [payrollFilters, setPayrollFilters] = useState({ from: '', to: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payrollError, setPayrollError] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError('');
        setUser(await adminService.getUserById(userId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat detail pengguna');
      } finally {
        setLoading(false);
      }
    };

    void loadUser();
  }, [userId]);

  const loadPayrolls = async (filters = payrollFilters) => {
    if (!userId) return;

    try {
      setPayrollError('');
      setPayrolls(await payrollService.getAll({
        userId,
        from: filters.from || undefined,
        to: filters.to || undefined,
        status: filters.status || undefined,
      }));
    } catch (err) {
      setPayrollError(err instanceof Error ? err.message : 'Gagal memuat data gaji pengguna');
    }
  };

  useEffect(() => {
    void loadPayrolls({ from: '', to: '', status: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <div className="page-shell animate-fade-in max-w-5xl mx-auto">
        <div className="surface-panel p-12 text-center text-slate-500">Memuat detail pengguna...</div>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in max-w-5xl mx-auto space-y-6">
      <header className="page-heading">
        <div>
          <Link href="/admin/users" className="page-eyebrow inline-flex hover:text-green-300">
            Pengguna
          </Link>
          <h1 className="text-2xl font-bold text-white mt-1">
            {user?.name || user?.username || 'Detail Pengguna'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{user?.email || userId}</p>
        </div>
        <Link href="/admin/users" className="btn-secondary">
          Kembali ke Pengguna
        </Link>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {!error && user && (
        <>
          <section className="surface-panel p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-green-900/40 border border-green-500/20 flex items-center justify-center text-xl font-bold text-green-300">
                  {(user.name || user.username || user.email || '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{user.name || user.username}</h2>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
              </div>
              <span className={`self-start md:self-center text-xs font-bold px-3 py-1 rounded-full border ${roleBadgeClass[user.role] || 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                {user.role}
              </span>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="surface-panel p-6">
              <h2 className="section-title mb-3">Informasi Akun</h2>
              <dl>
                <DetailRow label="ID Pengguna" value={user.id} />
                <DetailRow label="Username" value={user.username} />
                <DetailRow label="Nama" value={user.name} />
                <DetailRow label="Email" value={user.email} />
                <DetailRow label="Dibuat" value={formatDate(user.createdAt)} />
              </dl>
            </section>

            <section className="surface-panel p-6">
              <h2 className="section-title mb-3">Akses dan Penugasan</h2>
              <dl>
                <DetailRow label="Metode Login" value={[
                  user.hasPassword ? 'Password' : '',
                  user.googleLinked ? 'Google' : '',
                ].filter(Boolean).join(', ') || 'Belum ada'} />
                <DetailRow label="Google Terhubung" value={user.googleLinked ? 'Ya' : 'Tidak'} />
                <DetailRow label="Mandor ID" value={user.mandorId} />
                <DetailRow label="Kebun ID" value={user.kebunId} />
                <DetailRow label="Nomor Sertifikasi" value={user.certificationNumber} />
              </dl>
            </section>
          </div>

          <section className="surface-panel p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="section-title mb-1">Gaji Pengguna</h2>
                <p className="text-sm text-slate-500">Daftar gaji untuk profil ini dengan filter tanggal dan status.</p>
              </div>
            </div>

            {payrollError && <div className="alert-error mb-4">{payrollError}</div>}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (payrollFilters.from && payrollFilters.to && payrollFilters.to < payrollFilters.from) {
                  setPayrollError('Tanggal akhir tidak boleh sebelum tanggal mulai');
                  return;
                }
                void loadPayrolls(payrollFilters);
              }}
              className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end"
            >
              <div>
                <label className="label-sm">Tanggal Mulai</label>
                <input
                  type="date"
                  value={payrollFilters.from}
                  onChange={(event) => setPayrollFilters({ ...payrollFilters, from: event.target.value })}
                  className="ms-input"
                />
              </div>
              <div>
                <label className="label-sm">Tanggal Akhir</label>
                <input
                  type="date"
                  value={payrollFilters.to}
                  onChange={(event) => setPayrollFilters({ ...payrollFilters, to: event.target.value })}
                  className="ms-input"
                />
              </div>
              <div>
                <label className="label-sm">Status</label>
                <select
                  value={payrollFilters.status}
                  onChange={(event) => setPayrollFilters({ ...payrollFilters, status: event.target.value })}
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
                <button
                  type="button"
                  onClick={() => {
                    const empty = { from: '', to: '', status: '' };
                    setPayrollFilters(empty);
                    void loadPayrolls(empty);
                  }}
                  className="btn-ghost justify-center"
                >
                  <RefreshCw size={15} aria-hidden="true" />
                </button>
              </div>
            </form>

            {payrolls.length === 0 ? (
              <div className="empty-state py-8">Belum ada data gaji untuk pengguna ini.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {payrolls.map((payroll) => (
                  <article key={payroll.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="font-semibold text-white">Gaji #{payroll.id}</p>
                      <span className="badge badge-gray">{payrollStatusLabel[payroll.status] || payroll.status}</span>
                    </div>
                    <p className="text-sm text-slate-400">{formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}</p>
                    <p className="mt-2 text-lg font-bold text-green-300">{formatCurrency(payroll.totalAmount)}</p>
                    {payroll.rejectionReason && (
                      <p className="mt-2 text-sm text-red-300">{payroll.rejectionReason}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
