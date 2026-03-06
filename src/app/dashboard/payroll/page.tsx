'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { employeeService, payrollService } from '@/services/payroll.service';
import { authService } from '@/services/auth.service';
import { Employee, Payroll } from '@/types';

type Tab = 'employees' | 'payrolls';

const PAYROLL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-indigo-100 text-indigo-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
};

export default function PayrollPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('employees');

  // Employee state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empError, setEmpError] = useState('');
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empForm, setEmpForm] = useState({
    name: '',
    employeeCode: '',
    position: '',
    plantationId: '',
    phoneNumber: '',
    address: '',
    baseSalary: '',
    status: 'ACTIVE',
  });

  // Payroll state
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
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

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadEmployees();
    loadPayrolls();
  }, [router]);

  const loadEmployees = async () => {
    try {
      setEmpLoading(true);
      const data = await employeeService.getAll();
      setEmployees(data);
      setEmpError('');
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setEmpLoading(false);
    }
  };

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

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeeService.create({
        name: empForm.name,
        employeeCode: empForm.employeeCode,
        position: empForm.position,
        plantationId: empForm.plantationId ? parseInt(empForm.plantationId) : undefined,
        phoneNumber: empForm.phoneNumber || undefined,
        address: empForm.address || undefined,
        baseSalary: parseFloat(empForm.baseSalary),
        status: empForm.status,
      });
      setShowEmpForm(false);
      setEmpForm({ name: '', employeeCode: '', position: '', plantationId: '', phoneNumber: '', address: '', baseSalary: '', status: 'ACTIVE' });
      loadEmployees();
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : 'Failed to create employee');
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await employeeService.delete(id);
      loadEmployees();
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : 'Failed to delete employee');
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await payrollService.create({
        employeeId: parseInt(payForm.employeeId),
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
      setPayForm({ employeeId: '', periodStart: '', periodEnd: '', baseAmount: '', bonusAmount: '0', deductionAmount: '0', paymentMethod: 'BANK_TRANSFER', notes: '' });
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-green-800">Payroll Management</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'employees'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Employees
          </button>
          <button
            onClick={() => setActiveTab('payrolls')}
            className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'payrolls'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            💰 Payrolls
          </button>
        </div>

        {/* ── EMPLOYEES TAB ── */}
        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowEmpForm(!showEmpForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {showEmpForm ? 'Cancel' : '+ Add Employee'}
              </button>
            </div>

            {empError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{empError}</div>
            )}

            {showEmpForm && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Employee</h2>
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input type="text" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code</label>
                      <input type="text" value={empForm.employeeCode} onChange={(e) => setEmpForm({ ...empForm, employeeCode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                      <input type="text" value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Base Salary (IDR)</label>
                      <input type="number" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plantation ID (optional)</label>
                      <input type="number" value={empForm.plantationId} onChange={(e) => setEmpForm({ ...empForm, plantationId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number (optional)</label>
                      <input type="text" value={empForm.phoneNumber} onChange={(e) => setEmpForm({ ...empForm, phoneNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address (optional)</label>
                      <input type="text" value={empForm.address} onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select value={empForm.status} onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="TERMINATED">TERMINATED</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold">
                    Create Employee
                  </button>
                </form>
              </div>
            )}

            {empLoading ? (
              <div className="text-center py-12 text-gray-600">Loading employees...</div>
            ) : employees.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Employees Yet</h3>
                <p className="text-gray-600">Click &quot;Add Employee&quot; to register the first one</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map((emp) => (
                  <div key={emp.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-green-800">{emp.name}</h3>
                        <p className="text-xs text-gray-500">{emp.employeeCode}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${EMPLOYEE_STATUS_COLORS[emp.status] || 'bg-gray-100 text-gray-800'}`}>
                        {emp.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p><span className="font-medium">💼 Position:</span> {emp.position}</p>
                      <p><span className="font-medium">💵 Base Salary:</span> {formatCurrency(emp.baseSalary)}</p>
                      {emp.plantationId && (
                        <p><span className="font-medium">🌴 Plantation ID:</span> {emp.plantationId}</p>
                      )}
                      {emp.phoneNumber && (
                        <p><span className="font-medium">📞 Phone:</span> {emp.phoneNumber}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PAYROLLS TAB ── */}
        {activeTab === 'payrolls' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowPayForm(!showPayForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {showPayForm ? 'Cancel' : '+ Add Payroll'}
              </button>
            </div>

            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{payError}</div>
            )}

            {showPayForm && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Payroll Record</h2>
                <form onSubmit={handleCreatePayroll} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                      <input type="number" value={payForm.employeeId} onChange={(e) => setPayForm({ ...payForm, employeeId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
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
                <p className="text-gray-600">Click &quot;Add Payroll&quot; to create the first record</p>
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
                      <p><span className="font-medium">👤 Employee ID:</span> {payroll.employeeId}</p>
                      <p><span className="font-medium">📅 Period:</span> {new Date(payroll.periodStart).toLocaleDateString()} – {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                      <p><span className="font-medium">💵 Base:</span> {formatCurrency(payroll.baseAmount)}</p>
                      <p><span className="font-medium">🎁 Bonus:</span> {formatCurrency(payroll.bonusAmount)}</p>
                      <p><span className="font-medium">➖ Deduction:</span> {formatCurrency(payroll.deductionAmount)}</p>
                      <p className="font-semibold text-green-700"><span>💰 Total:</span> {formatCurrency(payroll.totalAmount)}</p>
                      {payroll.paymentMethod && (
                        <p><span className="font-medium">🏦 Method:</span> {payroll.paymentMethod}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {payroll.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprovePayroll(payroll.id)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Approve
                        </button>
                      )}
                      {payroll.status === 'APPROVED' && (
                        <button
                          onClick={() => handlePayPayroll(payroll.id)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Mark as Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePayroll(payroll.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
