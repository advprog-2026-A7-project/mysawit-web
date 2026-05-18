'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { employeeService, payrollService } from '@/services/payroll.service';
import { authService } from '@/services/auth.service';
import { Employee, Payroll } from '@/types';

type Tab = 'employees' | 'payrolls';

const PAYROLL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow',
  APPROVED: 'badge-blue',
  ACCEPTED: 'badge-purple',
  REJECTED: 'badge-red',
  PAID: 'badge-green',
  CANCELLED: 'badge-gray',
};

const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-green',
  INACTIVE: 'badge-yellow',
  TERMINATED: 'badge-red',
};

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [users, setUsers] = useState<UserDetailResponse[]>([]);
  const [usersError, setUsersError] = useState('');
  const [payLoading, setPayLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    baseAmount: '',
    bonusAmount: '0',
    deductionAmount: '0',
    paymentMethod: 'BANK_TRANSFER',
    notes: '',
  });
  const visibleEmployees = useMemo(() => employees.slice(0, 24), [employees]);
  const visiblePayrolls = useMemo(() => payrolls.slice(0, 24), [payrolls]);

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
    <div className="page-shell space-y-6 animate-fade-in">
      <header className="page-heading">
        <div>
          <p className="page-eyebrow">Payroll</p>
          <h1 className="text-2xl font-bold text-white">Gaji dan Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola pekerja, periode gaji, persetujuan, dan pembayaran.</p>
        </div>
      </header>

      <main>
        {/* Tabs */}
        <div className="tab-bar mb-6">
          <button
            onClick={() => setActiveTab('employees')}
            className={`tab-button ${activeTab === 'employees' ? 'active' : ''}`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab('payrolls')}
            className={`tab-button ${activeTab === 'payrolls' ? 'active' : ''}`}
          >
            Payrolls
          </button>
        </div>
      </div>

        {/* ── EMPLOYEES TAB ── */}
        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowEmpForm(!showEmpForm)}
                className="btn-primary"
              >
                {showEmpForm ? 'Cancel' : '+ Add Employee'}
              </button>
            </div>

            {empError && (
              <div className="alert-error mb-4">{empError}</div>
            )}

            {showEmpForm && (
              <div className="surface-panel bg-white p-5 mb-6">
                <h2 className="section-title mb-4">Tambah Pekerja</h2>
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label-sm">Full Name</label>
                      <input type="text" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Employee Code</label>
                      <input type="text" value={empForm.employeeCode} onChange={(e) => setEmpForm({ ...empForm, employeeCode: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Position</label>
                      <input type="text" value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Base Salary (IDR)</label>
                      <input type="number" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Plantation ID (optional)</label>
                      <input type="number" value={empForm.plantationId} onChange={(e) => setEmpForm({ ...empForm, plantationId: e.target.value })}
                        className="ms-input" />
                    </div>
                    <div>
                      <label className="label-sm">Phone Number (optional)</label>
                      <input type="text" value={empForm.phoneNumber} onChange={(e) => setEmpForm({ ...empForm, phoneNumber: e.target.value })}
                        className="ms-input" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label-sm">Address (optional)</label>
                      <input type="text" value={empForm.address} onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                        className="ms-input" />
                    </div>
                    <div>
                      <label className="label-sm">Status</label>
                      <select value={empForm.status} onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                        className="ms-input">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="TERMINATED">TERMINATED</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full justify-center py-3">
                    Create Employee
                  </button>
                </form>
              </div>
            )}

            {empLoading ? (
              <div className="text-center py-12 text-slate-500">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="empty-state bg-white p-12 text-center">
                <h3 className="text-xl font-semibold text-white mb-2">No Employees Yet</h3>
                <p className="text-slate-400">Click &quot;Add Employee&quot; to register the first one</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleEmployees.map((emp) => (
                  <div key={emp.id} className="surface-panel bg-white p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{emp.name}</h3>
                        <p className="text-xs text-slate-500">{emp.employeeCode}</p>
                      </div>
                      <span className={`badge ${EMPLOYEE_STATUS_COLORS[emp.status] || 'badge-gray'}`}>
                        {emp.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-400 mb-4">
                      <p><span className="font-medium text-slate-300">Position:</span> {emp.position}</p>
                      <p><span className="font-medium text-slate-300">Base Salary:</span> {formatCurrency(emp.baseSalary)}</p>
                      {emp.plantationId && (
                        <p><span className="font-medium text-slate-300">Plantation ID:</span> {emp.plantationId}</p>
                      )}
                      {emp.phoneNumber && (
                        <p><span className="font-medium text-slate-300">Phone:</span> {emp.phoneNumber}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="btn-danger w-full justify-center"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {employees.length > visibleEmployees.length && (
                  <div className="surface-panel p-5 text-sm text-slate-500">
                    Menampilkan {visibleEmployees.length} dari {employees.length} pekerja.
                  </div>
                )}
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                Create Payroll
              </button>
            </form>
          </div>
        )}

        {/* ── PAYROLLS TAB ── */}
        {activeTab === 'payrolls' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowPayForm(!showPayForm)}
                className="btn-primary"
              >
                {showPayForm ? 'Cancel' : '+ Add Payroll'}
              </button>
            </div>

            {payError && (
              <div className="alert-error mb-4">{payError}</div>
            )}

            {showPayForm && (
              <div className="surface-panel bg-white p-5 mb-6">
                <h2 className="section-title mb-4">Tambah Payroll</h2>
                <form onSubmit={handleCreatePayroll} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label-sm">Employee ID</label>
                      <input type="number" value={payForm.employeeId} onChange={(e) => setPayForm({ ...payForm, employeeId: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Base Amount (IDR)</label>
                      <input type="number" value={payForm.baseAmount} onChange={(e) => setPayForm({ ...payForm, baseAmount: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Period Start</label>
                      <input type="date" value={payForm.periodStart} onChange={(e) => setPayForm({ ...payForm, periodStart: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Period End</label>
                      <input type="date" value={payForm.periodEnd} onChange={(e) => setPayForm({ ...payForm, periodEnd: e.target.value })}
                        className="ms-input" required />
                    </div>
                    <div>
                      <label className="label-sm">Bonus Amount (IDR)</label>
                      <input type="number" value={payForm.bonusAmount} onChange={(e) => setPayForm({ ...payForm, bonusAmount: e.target.value })}
                        className="ms-input" />
                    </div>
                    <div>
                      <label className="label-sm">Deduction Amount (IDR)</label>
                      <input type="number" value={payForm.deductionAmount} onChange={(e) => setPayForm({ ...payForm, deductionAmount: e.target.value })}
                        className="ms-input" />
                    </div>
                    <div>
                      <label className="label-sm">Payment Method</label>
                      <select value={payForm.paymentMethod} onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                        className="ms-input">
                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                        <option value="CASH">CASH</option>
                        <option value="CHEQUE">CHEQUE</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-sm">Notes (optional)</label>
                      <input type="text" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                        className="ms-input" />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary w-full justify-center py-3">
                    Create Payroll
                  </button>
                </div>
              </div>
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
                {visiblePayrolls.map((payroll) => (
                  <div key={payroll.id} className="surface-panel bg-white p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-white">Payroll #{payroll.id}</h3>
                      <span className={`badge ${PAYROLL_STATUS_COLORS[payroll.status] || 'badge-gray'}`}>
                        {payroll.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-400 mb-4">
                      <p><span className="font-medium text-slate-300">Employee ID:</span> {payroll.employeeId}</p>
                      <p><span className="font-medium text-slate-300">Period:</span> {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                      <p><span className="font-medium text-slate-300">Base:</span> {formatCurrency(payroll.baseAmount)}</p>
                      <p><span className="font-medium text-slate-300">Bonus:</span> {formatCurrency(payroll.bonusAmount)}</p>
                      <p><span className="font-medium text-slate-300">Deduction:</span> {formatCurrency(payroll.deductionAmount)}</p>
                      <p className="font-semibold text-green-300"><span>Total:</span> {formatCurrency(payroll.totalAmount)}</p>
                      {payroll.paymentMethod && (
                        <p><span className="font-medium text-slate-300">Method:</span> {payroll.paymentMethod}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {payroll.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprovePayroll(payroll.id as number)}
                          className="btn-secondary w-full justify-center"
                        >
                          Approve
                        </button>
                      )}
                      {payroll.status === 'APPROVED' && (
                        <button
                          onClick={() => handlePayPayroll(payroll.id as number)}
                          className="btn-primary w-full justify-center"
                        >
                          Mark as Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePayroll(payroll.id as number)}
                        className="btn-danger w-full justify-center"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {payrolls.length > visiblePayrolls.length && (
                  <div className="surface-panel p-5 text-sm text-slate-500">
                    Menampilkan {visiblePayrolls.length} dari {payrolls.length} payroll.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
