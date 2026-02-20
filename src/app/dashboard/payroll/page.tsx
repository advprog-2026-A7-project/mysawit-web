'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { payrollService } from '@/services/payroll.service';
import { Employee, Payroll } from '@/types';

const toLocalDateTimeInput = (value: Date): string => {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('id-ID');
};

export default function PayrollPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showPayrollForm, setShowPayrollForm] = useState(false);

  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    employeeCode: '',
    position: '',
    plantationId: '',
    baseSalary: '',
    phoneNumber: '',
    address: '',
    hireDate: toLocalDateTimeInput(new Date()),
    status: 'ACTIVE',
  });

  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    periodStart: toLocalDateTimeInput(new Date()),
    periodEnd: toLocalDateTimeInput(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)),
    baseAmount: '',
    bonusAmount: '0',
    deductionAmount: '0',
    status: 'PENDING',
    paymentMethod: 'BANK_TRANSFER',
    notes: '',
  });

  const employeeMap = useMemo(() => {
    const map = new Map<number, Employee>();
    for (const employee of employees) {
      map.set(employee.id, employee);
    }
    return map;
  }, [employees]);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    void loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [employeeData, payrollData] = await Promise.all([
        payrollService.getEmployees(),
        payrollService.getPayrolls(),
      ]);
      setEmployees(employeeData);
      setPayrolls(payrollData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await payrollService.createEmployee({
        name: employeeForm.name,
        employeeCode: employeeForm.employeeCode,
        position: employeeForm.position,
        plantationId: employeeForm.plantationId
          ? Number.parseInt(employeeForm.plantationId, 10)
          : undefined,
        phoneNumber: employeeForm.phoneNumber || undefined,
        address: employeeForm.address || undefined,
        hireDate: employeeForm.hireDate || undefined,
        baseSalary: Number.parseFloat(employeeForm.baseSalary),
        status: employeeForm.status,
      });

      setEmployeeForm({
        name: '',
        employeeCode: '',
        position: '',
        plantationId: '',
        baseSalary: '',
        phoneNumber: '',
        address: '',
        hireDate: toLocalDateTimeInput(new Date()),
        status: 'ACTIVE',
      });
      setShowEmployeeForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    }
  };

  const handlePayrollSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await payrollService.createPayroll({
        employeeId: Number.parseInt(payrollForm.employeeId, 10),
        periodStart: payrollForm.periodStart,
        periodEnd: payrollForm.periodEnd,
        baseAmount: Number.parseFloat(payrollForm.baseAmount),
        bonusAmount: Number.parseFloat(payrollForm.bonusAmount),
        deductionAmount: Number.parseFloat(payrollForm.deductionAmount),
        status: payrollForm.status,
        paymentMethod: payrollForm.paymentMethod || undefined,
        notes: payrollForm.notes || undefined,
      });

      setPayrollForm({
        employeeId: '',
        periodStart: toLocalDateTimeInput(new Date()),
        periodEnd: toLocalDateTimeInput(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)),
        baseAmount: '',
        bonusAmount: '0',
        deductionAmount: '0',
        status: 'PENDING',
        paymentMethod: 'BANK_TRANSFER',
        notes: '',
      });
      setShowPayrollForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payroll');
    }
  };

  if (!authService.isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-3 justify-between items-center">
          <div>
            <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-green-800">Payroll Module (Dummy)</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEmployeeForm(!showEmployeeForm)}
              className="px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
            >
              {showEmployeeForm ? 'Cancel Employee' : '+ Add Employee'}
            </button>
            <button
              onClick={() => setShowPayrollForm(!showPayrollForm)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {showPayrollForm ? 'Cancel Payroll' : '+ Add Payroll'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Employees</p>
            <p className="text-2xl font-bold text-green-800">{employees.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total Payroll Records</p>
            <p className="text-2xl font-bold text-green-800">{payrolls.length}</p>
          </div>
        </div>

        {showEmployeeForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Employee</h2>
            <form onSubmit={handleEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={employeeForm.name}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder="Employee Code"
                  value={employeeForm.employeeCode}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, employeeCode: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="text"
                  placeholder="Position"
                  value={employeeForm.position}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, position: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder="Plantation ID (optional)"
                  value={employeeForm.plantationId}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, plantationId: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  step="1"
                  placeholder="Base Salary"
                  value={employeeForm.baseSalary}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, baseSalary: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <select
                  value={employeeForm.status}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={employeeForm.phoneNumber}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, phoneNumber: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={employeeForm.address}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, address: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="datetime-local"
                  value={employeeForm.hireDate}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, hireDate: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Save Employee
              </button>
            </form>
          </div>
        )}

        {showPayrollForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Payroll</h2>
            <form onSubmit={handlePayrollSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={payrollForm.employeeId}
                  onChange={(event) => setPayrollForm({ ...payrollForm, employeeId: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employeeCode} - {employee.name}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={payrollForm.periodStart}
                  onChange={(event) => setPayrollForm({ ...payrollForm, periodStart: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="datetime-local"
                  value={payrollForm.periodEnd}
                  onChange={(event) => setPayrollForm({ ...payrollForm, periodEnd: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="number"
                  placeholder="Base Amount"
                  value={payrollForm.baseAmount}
                  onChange={(event) => setPayrollForm({ ...payrollForm, baseAmount: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="number"
                  placeholder="Bonus Amount"
                  value={payrollForm.bonusAmount}
                  onChange={(event) => setPayrollForm({ ...payrollForm, bonusAmount: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Deduction Amount"
                  value={payrollForm.deductionAmount}
                  onChange={(event) => setPayrollForm({ ...payrollForm, deductionAmount: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={payrollForm.status}
                  onChange={(event) => setPayrollForm({ ...payrollForm, status: event.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <input
                  type="text"
                  value={payrollForm.paymentMethod}
                  onChange={(event) => setPayrollForm({ ...payrollForm, paymentMethod: event.target.value })}
                  placeholder="Payment Method"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  value={payrollForm.notes}
                  onChange={(event) => setPayrollForm({ ...payrollForm, notes: event.target.value })}
                  placeholder="Notes"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={employees.length === 0}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Save Payroll
              </button>
            </form>
            {employees.length === 0 && (
              <p className="mt-3 text-sm text-amber-700">Create at least one employee first.</p>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading payroll records...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">Employees</h3>
              {employees.length === 0 ? (
                <p className="text-gray-600 text-sm">No employee data.</p>
              ) : (
                <div className="space-y-3">
                  {employees.map((employee) => (
                    <div key={employee.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="font-semibold text-gray-800">
                        {employee.employeeCode} - {employee.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {employee.position} | {employee.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Base Salary: {formatCurrency(employee.baseSalary)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">Payrolls</h3>
              {payrolls.length === 0 ? (
                <p className="text-gray-600 text-sm">No payroll data.</p>
              ) : (
                <div className="space-y-3">
                  {payrolls.map((payroll) => (
                    <div key={payroll.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="font-semibold text-gray-800">
                        Payroll #{payroll.id} - {employeeMap.get(payroll.employeeId)?.name || `Employee #${payroll.employeeId}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {payroll.status} | Total: {formatCurrency(payroll.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Periode: {formatDateTime(payroll.periodStart)} - {formatDateTime(payroll.periodEnd)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
