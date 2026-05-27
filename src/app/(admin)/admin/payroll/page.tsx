'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { adminService } from '@/services/admin.service';
import { authService } from '@/services/auth.service';
import { payrollService, wageConfigService, walletService } from '@/services/payroll.service';
import { PaymentTransaction, Payroll, UserDetailResponse, WageConfig, Wallet } from '@/types';
import { CreditCard, Filter, RefreshCw, Settings, WalletCards } from 'lucide-react';

interface PayrollFormState {
  userId: string;
  periodStart: string;
  periodEnd: string;
  baseAmount: string;
  bonusAmount: string;
  deductionAmount: string;
  paymentMethod: string;
  notes: string;
}

const EMPTY_FORM: PayrollFormState = {
  userId: '',
  periodStart: '',
  periodEnd: '',
  baseAmount: '',
  bonusAmount: '0',
  deductionAmount: '0',
  paymentMethod: 'SANDBOX',
  notes: '',
};

const PAYROLL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow',
  APPROVED: 'badge-blue',
  ACCEPTED: 'badge-purple',
  REJECTED: 'badge-red',
  PAID: 'badge-green',
};

const PAYROLL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  ACCEPTED: 'Diterima',
  REJECTED: 'Ditolak',
  PAID: 'Dibayar',
};

const WAGE_ROLES = ['BURUH', 'SUPIR', 'MANDOR'] as const;
const visibleLimit = 24;

const getUserLabel = (user: UserDetailResponse) =>
  `${user.name || user.username || user.email} (${user.role})`;

const getPayrollUser = (users: UserDetailResponse[], userId: string) =>
  users.find((user) => String(user.id) === String(userId));

const canReceivePayroll = (user: UserDetailResponse) =>
  user.role === 'BURUH' || user.role === 'SUPIR' || user.role === 'MANDOR';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const formatSawitDollar = (amount: number) =>
  `${amount.toLocaleString('id-ID', { maximumFractionDigits: 2 })} SawitDollar`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [users, setUsers] = useState<UserDetailResponse[]>([]);
  const [wageConfigs, setWageConfigs] = useState<WageConfig[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [usersError, setUsersError] = useState('');
  const [payLoading, setPayLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [wageError, setWageError] = useState('');
  const [walletError, setWalletError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState<PayrollFormState>(EMPTY_FORM);
  const [payFilters, setPayFilters] = useState({
    userId: '',
    status: '',
    from: '',
    to: '',
  });
  const [wageForm, setWageForm] = useState({
    roleType: 'BURUH',
    ratePerKg: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [topUpAmount, setTopUpAmount] = useState('');
  const [savingWage, setSavingWage] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const currentUser = authService.getUserInfo();

  const visiblePayrolls = useMemo(() => payrolls.slice(0, visibleLimit), [payrolls]);
  const payrollUsers = useMemo(() => users.filter(canReceivePayroll), [users]);

  const loadPayrolls = async (filters = payFilters) => {
    try {
      setPayLoading(true);
      const data = await payrollService.getAll({
        userId: filters.userId || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      setPayrolls(data);
      setPayError('');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Gagal memuat data gaji');
    } finally {
      setPayLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
      setUsersError('');
      setPayForm((current) => ({
        ...current,
        userId: current.userId || data.find(canReceivePayroll)?.id || '',
      }));
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Gagal memuat daftar pengguna');
    }
  };

  const loadWageConfigs = async () => {
    try {
      const data = await wageConfigService.getAll();
      setWageConfigs(data);
      setWageError('');
    } catch (err) {
      setWageError(err instanceof Error ? err.message : 'Gagal memuat konfigurasi upah');
    }
  };

  const loadWallet = async () => {
    if (!currentUser?.id) return;

    try {
      const [walletData, txData] = await Promise.all([
        walletService.getWallet(String(currentUser.id)),
        walletService.getTransactions(String(currentUser.id)),
      ]);
      setWallet(walletData);
      setTransactions(txData);
      setWalletError('');
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Gagal memuat wallet Admin');
    }
  };

  useEffect(() => {
    void loadPayrolls({ userId: '', status: '', from: '', to: '' });
    void loadUsers();
    void loadWageConfigs();
    void loadWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterPayrolls = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (payFilters.from && payFilters.to && payFilters.to < payFilters.from) {
      setPayError('Tanggal akhir tidak boleh sebelum tanggal mulai');
      return;
    }
    await loadPayrolls(payFilters);
  };

  const handleResetPayrollFilters = async () => {
    const emptyFilters = { userId: '', status: '', from: '', to: '' };
    setPayFilters(emptyFilters);
    await loadPayrolls(emptyFilters);
  };

  const handleCreatePayroll = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await payrollService.create({
        userId: payForm.userId,
        roleType: getPayrollUser(users, payForm.userId)?.role,
        sourceType: 'MANUAL',
        periodStart: payForm.periodStart,
        periodEnd: payForm.periodEnd,
        baseAmount: Number.parseFloat(payForm.baseAmount),
        bonusAmount: Number.parseFloat(payForm.bonusAmount || '0'),
        deductionAmount: Number.parseFloat(payForm.deductionAmount || '0'),
        paymentMethod: payForm.paymentMethod,
        notes: payForm.notes.trim() || undefined,
        status: 'PENDING',
      });
      setShowPayForm(false);
      setPayForm({
        ...EMPTY_FORM,
        userId: payrollUsers[0]?.id || '',
      });
      await loadPayrolls(payFilters);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Gagal membuat data gaji');
    }
  };

  const handleApprovePayroll = async (id: Payroll['id']) => {
    try {
      await payrollService.approve(Number(id), currentUser?.id || undefined);
      await loadPayrolls(payFilters);
      await loadWallet();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Gagal menyetujui gaji');
    }
  };

  const handleRejectPayroll = async (id: Payroll['id']) => {
    const reason = prompt('Masukkan alasan penolakan gaji:');
    if (reason === null) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setPayError('Alasan penolakan gaji wajib diisi');
      return;
    }

    try {
      await payrollService.reject(Number(id), trimmedReason);
      await loadPayrolls(payFilters);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Gagal menolak gaji');
    }
  };

  const handlePayPayroll = async (id: Payroll['id']) => {
    try {
      await payrollService.pay(Number(id));
      await loadPayrolls(payFilters);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Gagal menandai gaji sebagai dibayar');
    }
  };

  const handleDeletePayroll = async (id: Payroll['id']) => {
    if (!confirm('Yakin ingin menghapus data gaji ini?')) return;

    try {
      await payrollService.delete(Number(id));
      await loadPayrolls(payFilters);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Gagal menghapus data gaji');
    }
  };

  const handleCreateWageConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ratePerKg = Number.parseFloat(wageForm.ratePerKg);
    if (!Number.isFinite(ratePerKg) || ratePerKg <= 0) {
      setWageError('Rate per kg harus lebih dari 0');
      return;
    }

    try {
      setSavingWage(true);
      await wageConfigService.create({
        roleType: wageForm.roleType,
        ratePerKg,
        effectiveDate: wageForm.effectiveDate,
        description: wageForm.description.trim() || undefined,
        createdBy: currentUser?.id || undefined,
      });
      setWageForm({
        roleType: 'BURUH',
        ratePerKg: '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        description: '',
      });
      await loadWageConfigs();
    } catch (err) {
      setWageError(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi upah');
    } finally {
      setSavingWage(false);
    }
  };

  const handleTopUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser?.id) return;

    const amountSawitDollar = Number.parseFloat(topUpAmount);
    if (!Number.isFinite(amountSawitDollar) || amountSawitDollar <= 0) {
      setWalletError('Jumlah top-up harus lebih dari 0 SawitDollar');
      return;
    }

    try {
      setTopUpLoading(true);
      await walletService.topUpSandbox(String(currentUser.id), {
        amountSawitDollar,
        gateway: 'MIDTRANS_SANDBOX',
      });
      setTopUpAmount('');
      await loadWallet();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Gagal membuat transaksi top-up');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleSettleSandbox = async (transactionId: string) => {
    try {
      setTopUpLoading(true);
      await walletService.settleSandbox(transactionId, 'PAID');
      await loadWallet();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : 'Gagal menyelesaikan transaksi sandbox');
    } finally {
      setTopUpLoading(false);
    }
  };

  return (
    <div className="page-shell space-y-6 animate-fade-in">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Gaji & Wallet</p>
          <h1 className="text-2xl font-bold text-white">Manajemen Gaji</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola periode gaji, upah per kilogram, persetujuan, dan saldo wallet pekerja.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPayForm((current) => !current)}
          className="btn-primary"
        >
          {showPayForm ? 'Tutup Form' : '+ Tambah Gaji'}
        </button>
      </header>

      {payError && <div className="alert-error mb-4">{payError}</div>}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="surface-panel p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">
                <WalletCards size={18} aria-hidden="true" />Wallet Admin
              </h2>
              <p className="section-subtitle">Saldo ini dipakai saat gaji disetujui.</p>
            </div>
            <button type="button" onClick={() => void loadWallet()} className="btn-ghost">
              <RefreshCw size={15} aria-hidden="true" />Refresh
            </button>
          </div>
          {walletError && <div className="alert-error mb-4">{walletError}</div>}
          <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Saldo Saat Ini</p>
            <p className="mt-1 text-2xl font-bold text-green-300">
              <span data-testid="wallet-balance">
              {formatSawitDollar(wallet?.balance || 0)}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">1 SawitDollar = Rp10.000</p>
          </div>
          <form onSubmit={handleTopUp} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="label-sm">Top Up SawitDollar</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={topUpAmount}
                onChange={(event) => setTopUpAmount(event.target.value)}
                className="ms-input"
                placeholder="Contoh: 100"
                required
              />
            </div>
            <button type="submit" disabled={topUpLoading} className="btn-primary justify-center">
              <CreditCard size={15} aria-hidden="true" />
              {topUpLoading ? 'Memproses...' : 'Top Up'}
            </button>
          </form>
          {transactions.length > 0 && (
            <div className="mt-4 space-y-2">
              {transactions.slice(0, 3).map((transaction) => (
                <div key={transaction.transactionId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-200">{formatSawitDollar(transaction.amountSawitDollar)}</p>
                    <p className="text-xs text-slate-500">{transaction.gateway} · {transaction.status}</p>
                  </div>
                  {transaction.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => void handleSettleSandbox(transaction.transactionId)}
                      className="btn-secondary text-xs"
                    >
                      Tandai Dibayar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-panel p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">
                <Settings size={18} aria-hidden="true" />Konfigurasi Upah per Kg
              </h2>
              <p className="section-subtitle">Atur variabel upah Buruh, Supir, dan Mandor.</p>
            </div>
          </div>
          {wageError && <div className="alert-error mb-4">{wageError}</div>}
          <form onSubmit={handleCreateWageConfig} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="label-sm">Peran</label>
              <select
                value={wageForm.roleType}
                onChange={(event) => setWageForm({ ...wageForm, roleType: event.target.value })}
                className="ms-input"
              >
                {WAGE_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-sm">Upah per Kg</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={wageForm.ratePerKg}
                onChange={(event) => setWageForm({ ...wageForm, ratePerKg: event.target.value })}
                className="ms-input"
                required
              />
            </div>
            <div>
              <label className="label-sm">Berlaku Mulai</label>
              <input
                type="date"
                value={wageForm.effectiveDate}
                onChange={(event) => setWageForm({ ...wageForm, effectiveDate: event.target.value })}
                className="ms-input"
                required
              />
            </div>
            <div>
              <label className="label-sm">Deskripsi</label>
              <input
                type="text"
                value={wageForm.description}
                onChange={(event) => setWageForm({ ...wageForm, description: event.target.value })}
                className="ms-input"
                placeholder="Opsional"
              />
            </div>
            <button type="submit" disabled={savingWage} className="btn-primary justify-center md:col-span-2">
              {savingWage ? 'Menyimpan...' : 'Simpan Konfigurasi Upah'}
            </button>
          </form>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {WAGE_ROLES.map((role) => {
              const active = wageConfigs
                .filter((config) => config.roleType === role)
                .sort((a, b) => String(b.effectiveDate).localeCompare(String(a.effectiveDate)))[0];
              return (
                <div key={role} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-xs font-bold text-slate-500">{role}</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {active ? formatCurrency(active.ratePerKg) : 'Belum diset'}
                  </p>
                  {active?.effectiveDate && (
                    <p className="mt-1 text-xs text-slate-500">{formatDate(active.effectiveDate)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <form onSubmit={handleFilterPayrolls} className="surface-panel p-4 grid grid-cols-1 gap-4 lg:grid-cols-5 lg:items-end">
        <div>
          <label className="label-sm">Filter Penerima</label>
          <select
            value={payFilters.userId}
            onChange={(event) => setPayFilters({ ...payFilters, userId: event.target.value })}
            className="ms-input"
          >
            <option value="">Semua Pengguna</option>
            {payrollUsers.map((user) => (
              <option key={user.id} value={user.id}>{getUserLabel(user)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-sm">Status</label>
          <select
            value={payFilters.status}
            onChange={(event) => setPayFilters({ ...payFilters, status: event.target.value })}
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
        <div>
          <label className="label-sm">Tanggal Mulai</label>
          <input
            type="date"
            value={payFilters.from}
            onChange={(event) => setPayFilters({ ...payFilters, from: event.target.value })}
            className="ms-input"
          />
        </div>
        <div>
          <label className="label-sm">Tanggal Akhir</label>
          <input
            type="date"
            value={payFilters.to}
            onChange={(event) => setPayFilters({ ...payFilters, to: event.target.value })}
            className="ms-input"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1 justify-center">
            <Filter size={15} aria-hidden="true" />Filter
          </button>
          <button type="button" onClick={handleResetPayrollFilters} className="btn-ghost justify-center">
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>
      </form>

      {showPayForm && (
        <section className="surface-panel bg-white p-5">
          <h2 className="section-title mb-4">Tambah Data Gaji</h2>
          {usersError && <div className="alert-error mb-4">{usersError}</div>}
          <form onSubmit={handleCreatePayroll} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-sm">Penerima</label>
                <select
                  value={payForm.userId}
                  onChange={(e) => setPayForm({ ...payForm, userId: e.target.value })}
                  className="ms-input"
                  required
                >
                  <option value="" disabled>Pilih penerima</option>
                  {payrollUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserLabel(user)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-sm">Gaji Pokok (IDR)</label>
                <input
                  type="number"
                  value={payForm.baseAmount}
                  onChange={(e) => setPayForm({ ...payForm, baseAmount: e.target.value })}
                  className="ms-input"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Bonus (IDR)</label>
                <input
                  type="number"
                  value={payForm.bonusAmount}
                  onChange={(e) => setPayForm({ ...payForm, bonusAmount: e.target.value })}
                  className="ms-input"
                />
              </div>
              <div>
                <label className="label-sm">Potongan (IDR)</label>
                <input
                  type="number"
                  value={payForm.deductionAmount}
                  onChange={(e) => setPayForm({ ...payForm, deductionAmount: e.target.value })}
                  className="ms-input"
                />
              </div>
              <div>
                <label className="label-sm">Periode Mulai</label>
                <input
                  type="date"
                  value={payForm.periodStart}
                  onChange={(e) => setPayForm({ ...payForm, periodStart: e.target.value })}
                  className="ms-input"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Periode Selesai</label>
                <input
                  type="date"
                  value={payForm.periodEnd}
                  onChange={(e) => setPayForm({ ...payForm, periodEnd: e.target.value })}
                  className="ms-input"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Metode Pembayaran</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                  className="ms-input"
                >
                  <option value="SANDBOX">SANDBOX</option>
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="CASH">CASH</option>
                  <option value="CHEQUE">CHEQUE</option>
                </select>
              </div>
              <div>
                <label className="label-sm">Catatan (opsional)</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="ms-input"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3">
              Buat Data Gaji
            </button>
          </form>
        </section>
      )}

      {payLoading ? (
        <div className="text-center py-12 text-slate-500">Memuat data gaji...</div>
      ) : payrolls.length === 0 ? (
        <div className="empty-state bg-white p-12 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Belum Ada Data Gaji</h3>
          <p className="text-slate-400">Gunakan tombol &quot;Tambah Gaji&quot; untuk membuat data gaji pertama.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePayrolls.map((payroll) => {
            const payrollUser = getPayrollUser(users, payroll.userId);

            return (
            <article key={payroll.id} className="surface-panel bg-white p-5">
              <div className="flex justify-between items-start gap-3 mb-3">
                <h3 className="text-lg font-semibold text-white">Gaji #{payroll.id}</h3>
                <span className={`badge ${PAYROLL_STATUS_COLORS[payroll.status] || 'badge-gray'}`}>
                  {PAYROLL_STATUS_LABELS[payroll.status] || payroll.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-400 mb-4">
                <p><span className="font-medium text-slate-300">Penerima:</span> {payrollUser ? getUserLabel(payrollUser) : payroll.userId}</p>
                {payroll.roleType && <p><span className="font-medium text-slate-300">Peran:</span> {payroll.roleType}</p>}
                {payroll.sourceType && <p><span className="font-medium text-slate-300">Sumber:</span> {payroll.sourceType}</p>}
                {payroll.kilograms && <p><span className="font-medium text-slate-300">Kg:</span> {payroll.kilograms}</p>}
                <p><span className="font-medium text-slate-300">Periode:</span> {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}</p>
                <p><span className="font-medium text-slate-300">Gaji Pokok:</span> {formatCurrency(payroll.baseAmount)}</p>
                <p><span className="font-medium text-slate-300">Bonus:</span> {formatCurrency(payroll.bonusAmount)}</p>
                <p><span className="font-medium text-slate-300">Potongan:</span> {formatCurrency(payroll.deductionAmount)}</p>
                <p className="font-semibold text-green-300"><span>Total:</span> {formatCurrency(payroll.totalAmount)}</p>
                {payroll.paymentMethod && (
                  <p><span className="font-medium text-slate-300">Metode:</span> {payroll.paymentMethod}</p>
                )}
                {payroll.rejectionReason && (
                  <p><span className="font-medium text-slate-300">Alasan Penolakan:</span> {payroll.rejectionReason}</p>
                )}
                {payroll.walletSettled && (
                  <p><span className="font-medium text-slate-300">Wallet:</span> sudah ditransfer{payroll.walletTransferAmount ? ` (${formatCurrency(payroll.walletTransferAmount)})` : ''}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {payroll.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => handleApprovePayroll(payroll.id)}
                    data-testid="payroll-approve-button"
                    className="btn-secondary w-full justify-center"
                  >
                    Setujui
                  </button>
                )}
                {payroll.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => handleRejectPayroll(payroll.id)}
                    className="btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10 w-full justify-center"
                  >
                    Tolak
                  </button>
                )}
                {payroll.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handlePayPayroll(payroll.id)}
                    className="btn-primary w-full justify-center"
                  >
                    Tandai Dibayar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeletePayroll(payroll.id)}
                  className="btn-danger w-full justify-center"
                >
                  Hapus
                </button>
              </div>
            </article>
            );
          })}
          {payrolls.length > visiblePayrolls.length && (
            <div className="surface-panel p-5 text-sm text-slate-500">
              Menampilkan {visiblePayrolls.length} dari {payrolls.length} data gaji.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
