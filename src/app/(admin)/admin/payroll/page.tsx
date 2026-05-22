'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { adminService } from '@/services/admin.service';
import { authService } from '@/services/auth.service';
import { payrollService } from '@/services/payroll.service';
import { Payroll, UserDetailResponse } from '@/types';

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
  const [usersError, setUsersError] = useState('');
  const [payLoading, setPayLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState<PayrollFormState>(EMPTY_FORM);
  const currentUser = authService.getUserInfo();

  const visiblePayrolls = useMemo(() => payrolls.slice(0, visibleLimit), [payrolls]);
  const payrollUsers = useMemo(() => users.filter(canReceivePayroll), [users]);

  const loadPayrolls = async () => {
    try {
      setPayLoading(true);
      const data = await payrollService.getAll();
      setPayrolls(data);
      setPayError('');
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to load payrolls');
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
      setUsersError(err instanceof Error ? err.message : 'Failed to load users');
    }
  };

  useEffect(() => {
    void loadPayrolls();
    void loadUsers();
  }, []);

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
      await loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to create payroll');
    }
  };

  const handleApprovePayroll = async (id: Payroll['id']) => {
    try {
      await payrollService.approve(Number(id), currentUser?.id || undefined);
      await loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to approve payroll');
    }
  };

  const handleRejectPayroll = async (id: Payroll['id']) => {
    const reason = prompt('Masukkan alasan penolakan payroll:');
    if (!reason?.trim()) return;

    try {
      await payrollService.reject(Number(id), reason.trim());
      await loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to reject payroll');
    }
  };

  const handlePayPayroll = async (id: Payroll['id']) => {
    try {
      await payrollService.pay(Number(id));
      await loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to mark payroll as paid');
    }
  };

  const handleDeletePayroll = async (id: Payroll['id']) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;

    try {
      await payrollService.delete(Number(id));
      await loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to delete payroll');
    }
  };

  return (
    <div className="page-shell space-y-6 animate-fade-in">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Payroll</p>
          <h1 className="text-2xl font-bold text-white">Gaji dan Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola periode gaji, persetujuan, dan pembayaran pekerja.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPayForm((current) => !current)}
          className="btn-primary"
        >
          {showPayForm ? 'Cancel' : '+ Add Payroll'}
        </button>
      </header>

      {payError && <div className="alert-error mb-4">{payError}</div>}

      {showPayForm && (
        <section className="surface-panel bg-white p-5">
          <h2 className="section-title mb-4">Tambah Payroll</h2>
          {usersError && <div className="alert-error mb-4">{usersError}</div>}
          <form onSubmit={handleCreatePayroll} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-sm">User</label>
                <select
                  value={payForm.userId}
                  onChange={(e) => setPayForm({ ...payForm, userId: e.target.value })}
                  className="ms-input"
                  required
                >
                  <option value="" disabled>Pilih user</option>
                  {payrollUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getUserLabel(user)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-sm">Base Amount (IDR)</label>
                <input
                  type="number"
                  value={payForm.baseAmount}
                  onChange={(e) => setPayForm({ ...payForm, baseAmount: e.target.value })}
                  className="ms-input"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Bonus Amount (IDR)</label>
                <input
                  type="number"
                  value={payForm.bonusAmount}
                  onChange={(e) => setPayForm({ ...payForm, bonusAmount: e.target.value })}
                  className="ms-input"
                />
              </div>
              <div>
                <label className="label-sm">Deduction Amount (IDR)</label>
                <input
                  type="number"
                  value={payForm.deductionAmount}
                  onChange={(e) => setPayForm({ ...payForm, deductionAmount: e.target.value })}
                  className="ms-input"
                />
              </div>
              <div>
                <label className="label-sm">Period Start</label>
                <input
                  type="date"
                  value={payForm.periodStart}
                  onChange={(e) => setPayForm({ ...payForm, periodStart: e.target.value })}
                  className="ms-input"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Period End</label>
                <input
                  type="date"
                  value={payForm.periodEnd}
                  onChange={(e) => setPayForm({ ...payForm, periodEnd: e.target.value })}
                  className="ms-input"
                  required
                />
              </div>
              <div>
                <label className="label-sm">Payment Method</label>
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
                <label className="label-sm">Notes (optional)</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="ms-input"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3">
              Create Payroll
            </button>
          </form>
        </section>
      )}

      {payLoading ? (
        <div className="text-center py-12 text-slate-500">Loading payrolls...</div>
      ) : payrolls.length === 0 ? (
        <div className="empty-state bg-white p-12 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">No Payroll Records Yet</h3>
          <p className="text-slate-400">Click &quot;Add Payroll&quot; to create the first payroll record</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePayrolls.map((payroll) => {
            const payrollUser = getPayrollUser(users, payroll.userId);

            return (
            <article key={payroll.id} className="surface-panel bg-white p-5">
              <div className="flex justify-between items-start gap-3 mb-3">
                <h3 className="text-lg font-semibold text-white">Payroll #{payroll.id}</h3>
                <span className={`badge ${PAYROLL_STATUS_COLORS[payroll.status] || 'badge-gray'}`}>
                  {payroll.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-slate-400 mb-4">
                <p><span className="font-medium text-slate-300">User:</span> {payrollUser ? getUserLabel(payrollUser) : payroll.userId}</p>
                {payroll.roleType && <p><span className="font-medium text-slate-300">Role:</span> {payroll.roleType}</p>}
                {payroll.sourceType && <p><span className="font-medium text-slate-300">Source:</span> {payroll.sourceType}</p>}
                {payroll.kilograms && <p><span className="font-medium text-slate-300">Kg:</span> {payroll.kilograms}</p>}
                <p><span className="font-medium text-slate-300">Period:</span> {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}</p>
                <p><span className="font-medium text-slate-300">Base:</span> {formatCurrency(payroll.baseAmount)}</p>
                <p><span className="font-medium text-slate-300">Bonus:</span> {formatCurrency(payroll.bonusAmount)}</p>
                <p><span className="font-medium text-slate-300">Deduction:</span> {formatCurrency(payroll.deductionAmount)}</p>
                <p className="font-semibold text-green-300"><span>Total:</span> {formatCurrency(payroll.totalAmount)}</p>
                {payroll.paymentMethod && (
                  <p><span className="font-medium text-slate-300">Method:</span> {payroll.paymentMethod}</p>
                )}
                {payroll.rejectionReason && (
                  <p><span className="font-medium text-slate-300">Rejection:</span> {payroll.rejectionReason}</p>
                )}
                {payroll.walletSettled && (
                  <p><span className="font-medium text-slate-300">Wallet:</span> settled{payroll.walletTransferAmount ? ` (${formatCurrency(payroll.walletTransferAmount)})` : ''}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {(payroll.status === 'PENDING' || payroll.status === 'ACCEPTED') && (
                  <button
                    type="button"
                    onClick={() => handleApprovePayroll(payroll.id)}
                    className="btn-secondary w-full justify-center"
                  >
                    Approve
                  </button>
                )}
                {(payroll.status === 'PENDING' || payroll.status === 'ACCEPTED') && (
                  <button
                    type="button"
                    onClick={() => handleRejectPayroll(payroll.id)}
                    className="btn-secondary border-red-500/30 text-red-400 hover:bg-red-500/10 w-full justify-center"
                  >
                    Reject
                  </button>
                )}
                {payroll.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => handlePayPayroll(payroll.id)}
                    className="btn-primary w-full justify-center"
                  >
                    Mark as Paid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeletePayroll(payroll.id)}
                  className="btn-danger w-full justify-center"
                >
                  Delete
                </button>
              </div>
            </article>
            );
          })}
          {payrolls.length > visiblePayrolls.length && (
            <div className="surface-panel p-5 text-sm text-slate-500">
              Menampilkan {visiblePayrolls.length} dari {payrolls.length} payroll.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
