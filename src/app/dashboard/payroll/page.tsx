'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { payrollService } from '@/services/payroll.service';
import { adminService } from '@/services/admin.service';
import { Payroll, UserDetailResponse } from '@/types';

const PAYROLL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-indigo-100 text-indigo-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const EMPTY_FORM = {
  userId: '',
  periodStart: '',
  periodEnd: '',
  baseAmount: '',
  bonusAmount: '0',
  deductionAmount: '0',
  paymentMethod: 'BANK_TRANSFER',
  notes: '',
};

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [users, setUsers] = useState<UserDetailResponse[]>([]);
  const [usersError, setUsersError] = useState('');
  const [payLoading, setPayLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadPayrolls();
    loadUsers();
  }, []);

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
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Failed to load users');
    }
  };

  const handleCreatePayroll = async (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    try {
      await payrollService.create({
        userId: payForm.userId,
        periodStart: payForm.periodStart,
        periodEnd: payForm.periodEnd,
        baseAmount: parseFloat(payForm.baseAmount),
        bonusAmount: parseFloat(payForm.bonusAmount),
        deductionAmount: parseFloat(payForm.deductionAmount),
        paymentMethod: payForm.paymentMethod,
        notes: payForm.notes || undefined,
        status: 'PENDING',
      });
      setShowPayForm(false);
      setPayForm(EMPTY_FORM);
      loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to create payroll');
    }
  };

  const handleApprovePayroll = async (id: number) => {
    try {
      await payrollService.approve(id);
      loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to approve payroll');
    }
  };

  const handlePayPayroll = async (id: number) => {
    try {
      await payrollService.pay(id);
      loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to mark payroll as paid');
    }
  };

  const handleDeletePayroll = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await payrollService.delete(id);
      loadPayrolls();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Failed to delete payroll');
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <>
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Payroll Management</h1>
          </div>
          <button
            onClick={() => setShowPayForm(!showPayForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showPayForm ? 'Cancel' : '+ Add Payroll'}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {payError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{payError}</div>
        )}

        {showPayForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Payroll</h2>
            {usersError && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4 text-sm">
                Could not load user list: {usersError}. Dropdown will be empty.
              </div>
            )}
            <form onSubmit={handleCreatePayroll} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                  <select
                    value={payForm.userId}
                    onChange={(e) => setPayForm({ ...payForm, userId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    disabled={users.length === 0}
                  >
                    <option value="">{users.length === 0 ? 'No users available' : 'Select a user…'}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.username} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Amount (IDR)</label>
                  <input type="number" value={payForm.baseAmount} onChange={(e) => setPayForm({ ...payForm, baseAmount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period Start</label>
                  <input type="date" value={payForm.periodStart} onChange={(e) => setPayForm({ ...payForm, periodStart: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Period End</label>
                  <input type="date" value={payForm.periodEnd} onChange={(e) => setPayForm({ ...payForm, periodEnd: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bonus Amount (IDR)</label>
                  <input type="number" value={payForm.bonusAmount} onChange={(e) => setPayForm({ ...payForm, bonusAmount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deduction Amount (IDR)</label>
                  <input type="number" value={payForm.deductionAmount} onChange={(e) => setPayForm({ ...payForm, deductionAmount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="CASH">CASH</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <input type="text" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                Create Payroll
              </button>
            </form>
          </div>
        )}

        {payLoading ? (
          <div className="text-center py-12 text-gray-600">Loading payrolls...</div>
        ) : payrolls.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Payroll Records Yet</h3>
            <p className="text-gray-600">Click &quot;Add Payroll&quot; to create the first payroll record</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payrolls.map((payroll) => (
              <div key={payroll.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-green-800">Payroll #{payroll.id}</h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${PAYROLL_STATUS_COLORS[payroll.status] || 'bg-gray-100 text-gray-800'}`}>
                    {payroll.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p className="break-all"><span className="font-medium">👤 User ID:</span> {payroll.userId}</p>
                  <p><span className="font-medium">📅 Period:</span> {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                  <p><span className="font-medium">💵 Base:</span> {formatCurrency(payroll.baseAmount)}</p>
                  <p><span className="font-medium">🎁 Bonus:</span> {formatCurrency(payroll.bonusAmount)}</p>
                  <p><span className="font-medium">➖ Deduction:</span> {formatCurrency(payroll.deductionAmount)}</p>
                  <p className="font-semibold text-green-700"><span>💰 Total:</span> {formatCurrency(payroll.totalAmount)}</p>
                  {payroll.paymentMethod && (
                    <p><span className="font-medium">🏦 Method:</span> {payroll.paymentMethod}</p>
                  )}
                  {payroll.notes && (
                    <p><span className="font-medium">📝 Notes:</span> {payroll.notes}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {payroll.status === 'PENDING' && (
                    <button
                      onClick={() => handleApprovePayroll(payroll.id as number)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Approve
                    </button>
                  )}
                  {payroll.status === 'APPROVED' && (
                    <button
                      onClick={() => handlePayPayroll(payroll.id as number)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Mark as Paid
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletePayroll(payroll.id as number)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
