'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { payrollService, wageConfigService, walletService } from '@/services/payroll.service';
import { Payroll, WageConfig, Wallet } from '@/types';

type Tab = 'payrolls' | 'wallets' | 'wage-configs';

const PAYROLL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-indigo-100 text-indigo-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const optionalText = (value: string) => value || undefined;

export default function PayrollPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('payrolls');
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [payLoading, setPayLoading] = useState(true);
  const [payError, setPayError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    userId: '',
    roleType: 'BURUH',
    periodStart: '',
    periodEnd: '',
    baseAmount: '',
    bonusAmount: '0',
    deductionAmount: '0',
    paymentMethod: 'SANDBOX',
    notes: '',
  });

  const [walletUserId, setWalletUserId] = useState('admin');
  const [walletAmount, setWalletAmount] = useState('100');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletError, setWalletError] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  const [wageConfigs, setWageConfigs] = useState<WageConfig[]>([]);
  const [wageError, setWageError] = useState('');
  const [wageLoading, setWageLoading] = useState(false);
  const [showWageForm, setShowWageForm] = useState(false);
  const [wageForm, setWageForm] = useState({
    roleType: 'BURUH',
    ratePerKg: '',
    effectiveDate: '',
    description: '',
    createdBy: 'admin',
  });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }
    void loadPayrolls();
    void loadWageConfigs();
  }, [router]);

  const loadPayrolls = async () => {
    try {
      setPayLoading(true);
      const data = await payrollService.getAll();
      setPayrolls(data);
      setPayError('');
    } catch (err) {
      setPayError(errorMessage(err, 'Failed to load payrolls'));
    } finally {
      setPayLoading(false);
    }
  };

  const loadWageConfigs = async () => {
    try {
      setWageLoading(true);
      const data = await wageConfigService.getAll();
      setWageConfigs(data);
      setWageError('');
    } catch (err) {
      setWageError(errorMessage(err, 'Failed to load wage configs'));
    } finally {
      setWageLoading(false);
    }
  };

  const handleCreatePayroll = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      await payrollService.create({
        userId: payForm.userId,
        roleType: payForm.roleType,
        periodStart: payForm.periodStart,
        periodEnd: payForm.periodEnd,
        baseAmount: parseFloat(payForm.baseAmount),
        bonusAmount: parseFloat(payForm.bonusAmount),
        deductionAmount: parseFloat(payForm.deductionAmount),
        paymentMethod: payForm.paymentMethod,
        notes: optionalText(payForm.notes),
        status: 'PENDING',
      });
      setShowPayForm(false);
      setPayForm({
        userId: '',
        roleType: 'BURUH',
        periodStart: '',
        periodEnd: '',
        baseAmount: '',
        bonusAmount: '0',
        deductionAmount: '0',
        paymentMethod: 'SANDBOX',
        notes: '',
      });
      await loadPayrolls();
    } catch (err) {
      setPayError(errorMessage(err, 'Failed to create payroll'));
    }
  };

  const handleApprovePayroll = async (id: number) => {
    try {
      await payrollService.approve(id);
      await loadPayrolls();
    } catch (err) {
      setPayError(errorMessage(err, 'Failed to approve payroll'));
    }
  };

  const handlePayPayroll = async (id: number) => {
    try {
      await payrollService.pay(id, 'SANDBOX');
      await loadPayrolls();
    } catch (err) {
      setPayError(errorMessage(err, 'Failed to mark payroll as paid'));
    }
  };

  const handleDeletePayroll = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payroll record?')) return;
    try {
      await payrollService.delete(id);
      await loadPayrolls();
    } catch (err) {
      setPayError(errorMessage(err, 'Failed to delete payroll'));
    }
  };

  const handleLoadWallet = async () => {
    try {
      setWalletLoading(true);
      const data = await walletService.getByUser(walletUserId);
      setWallet(data);
      setWalletError('');
    } catch (err) {
      setWalletError(errorMessage(err, 'Failed to load wallet'));
    } finally {
      setWalletLoading(false);
    }
  };

  const handleTopUpWallet = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      setWalletLoading(true);
      await walletService.topUpSandbox(walletUserId, {
        amountSawitDollar: parseFloat(walletAmount),
        gateway: 'SANDBOX',
      });
      const data = await walletService.getByUser(walletUserId);
      setWallet(data);
      setWalletError('');
    } catch (err) {
      setWalletError(errorMessage(err, 'Failed to top up wallet'));
    } finally {
      setWalletLoading(false);
    }
  };

  const handleCreateWageConfig = async (event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    try {
      await wageConfigService.create({
        roleType: wageForm.roleType,
        ratePerKg: parseFloat(wageForm.ratePerKg),
        effectiveDate: wageForm.effectiveDate,
        description: optionalText(wageForm.description),
        createdBy: optionalText(wageForm.createdBy),
      });
      setShowWageForm(false);
      setWageForm({
        roleType: 'BURUH',
        ratePerKg: '',
        effectiveDate: '',
        description: '',
        createdBy: 'admin',
      });
      await loadWageConfigs();
    } catch (err) {
      setWageError(errorMessage(err, 'Failed to create wage config'));
    }
  };

  if (!authService.isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-green-600 hover:text-green-700 text-sm">
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-green-800">Payroll Management</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('payrolls')}
            className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'payrolls' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Payrolls
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'wallets' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Wallets
          </button>
          <button
            onClick={() => setActiveTab('wage-configs')}
            className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
              activeTab === 'wage-configs' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Wage Configs
          </button>
        </div>

        {activeTab === 'payrolls' && (
          <section>
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
                      <label htmlFor="payroll-user-id" className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                      <input
                        id="payroll-user-id"
                        type="text"
                        value={payForm.userId}
                        onChange={(event) => setPayForm({ ...payForm, userId: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="payroll-role-type" className="block text-sm font-medium text-gray-700 mb-2">Role Type</label>
                      <select
                        id="payroll-role-type"
                        value={payForm.roleType}
                        onChange={(event) => setPayForm({ ...payForm, roleType: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="BURUH">BURUH</option>
                        <option value="SUPIR">SUPIR</option>
                        <option value="MANDOR">MANDOR</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="payroll-base-amount" className="block text-sm font-medium text-gray-700 mb-2">Base Amount</label>
                      <input
                        id="payroll-base-amount"
                        type="number"
                        value={payForm.baseAmount}
                        onChange={(event) => setPayForm({ ...payForm, baseAmount: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="payroll-period-start" className="block text-sm font-medium text-gray-700 mb-2">Period Start</label>
                      <input
                        id="payroll-period-start"
                        type="date"
                        value={payForm.periodStart}
                        onChange={(event) => setPayForm({ ...payForm, periodStart: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="payroll-period-end" className="block text-sm font-medium text-gray-700 mb-2">Period End</label>
                      <input
                        id="payroll-period-end"
                        type="date"
                        value={payForm.periodEnd}
                        onChange={(event) => setPayForm({ ...payForm, periodEnd: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="payroll-bonus-amount" className="block text-sm font-medium text-gray-700 mb-2">Bonus Amount</label>
                      <input
                        id="payroll-bonus-amount"
                        type="number"
                        value={payForm.bonusAmount}
                        onChange={(event) => setPayForm({ ...payForm, bonusAmount: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="payroll-deduction-amount" className="block text-sm font-medium text-gray-700 mb-2">Deduction Amount</label>
                      <input
                        id="payroll-deduction-amount"
                        type="number"
                        value={payForm.deductionAmount}
                        onChange={(event) => setPayForm({ ...payForm, deductionAmount: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="payroll-payment-method" className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                      <select
                        id="payroll-payment-method"
                        value={payForm.paymentMethod}
                        onChange={(event) => setPayForm({ ...payForm, paymentMethod: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="SANDBOX">SANDBOX</option>
                        <option value="CASH">CASH</option>
                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="payroll-notes" className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <input
                        id="payroll-notes"
                        type="text"
                        value={payForm.notes}
                        onChange={(event) => setPayForm({ ...payForm, notes: event.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
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
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Payroll Records Yet</h3>
                <p className="text-gray-600">Click Add Payroll to create the first record</p>
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
                      <p><span className="font-medium">User ID:</span> {payroll.userId}</p>
                      {payroll.roleType && <p><span className="font-medium">Role:</span> {payroll.roleType}</p>}
                      <p><span className="font-medium">Period:</span> {new Date(payroll.periodStart).toLocaleDateString()} - {new Date(payroll.periodEnd).toLocaleDateString()}</p>
                      <p><span className="font-medium">Base:</span> {formatCurrency(payroll.baseAmount)}</p>
                      <p><span className="font-medium">Bonus:</span> {formatCurrency(payroll.bonusAmount)}</p>
                      <p><span className="font-medium">Deduction:</span> {formatCurrency(payroll.deductionAmount)}</p>
                      <p className="font-semibold text-green-700"><span>Total:</span> {formatCurrency(payroll.totalAmount)}</p>
                      {payroll.walletTransferAmount !== undefined && (
                        <p><span className="font-medium">Wallet Transfer:</span> {payroll.walletTransferAmount}</p>
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
          </section>
        )}

        {activeTab === 'wallets' && (
          <section className="space-y-6">
            {walletError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{walletError}</div>
            )}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Wallet Sandbox</h2>
              <form onSubmit={handleTopUpWallet} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="wallet-user-id" className="block text-sm font-medium text-gray-700 mb-2">Wallet User ID</label>
                  <input
                    id="wallet-user-id"
                    type="text"
                    value={walletUserId}
                    onChange={(event) => setWalletUserId(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="wallet-amount" className="block text-sm font-medium text-gray-700 mb-2">Sawit Dollar Amount</label>
                  <input
                    id="wallet-amount"
                    type="number"
                    value={walletAmount}
                    onChange={(event) => setWalletAmount(event.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button type="button" onClick={handleLoadWallet} className="flex-1 px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50">
                    Load Wallet
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Top Up Wallet
                  </button>
                </div>
              </form>
              {walletLoading && <p className="mt-4 text-sm text-gray-600">Loading wallet...</p>}
              {wallet && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-semibold text-green-800">Wallet {wallet.userId}</p>
                  <p className="text-green-800">Balance: {wallet.balance} Sawit Dollar</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'wage-configs' && (
          <section className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowWageForm(!showWageForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {showWageForm ? 'Cancel' : '+ Add Wage Config'}
              </button>
            </div>
            {wageError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{wageError}</div>
            )}
            {showWageForm && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Wage Config</h2>
                <form onSubmit={handleCreateWageConfig} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="wage-role-type" className="block text-sm font-medium text-gray-700 mb-2">Wage Role Type</label>
                    <select
                      id="wage-role-type"
                      value={wageForm.roleType}
                      onChange={(event) => setWageForm({ ...wageForm, roleType: event.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="BURUH">BURUH</option>
                      <option value="SUPIR">SUPIR</option>
                      <option value="MANDOR">MANDOR</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="wage-rate-per-kg" className="block text-sm font-medium text-gray-700 mb-2">Rate Per Kg</label>
                    <input
                      id="wage-rate-per-kg"
                      type="number"
                      value={wageForm.ratePerKg}
                      onChange={(event) => setWageForm({ ...wageForm, ratePerKg: event.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="wage-effective-date" className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
                    <input
                      id="wage-effective-date"
                      type="date"
                      value={wageForm.effectiveDate}
                      onChange={(event) => setWageForm({ ...wageForm, effectiveDate: event.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="wage-created-by" className="block text-sm font-medium text-gray-700 mb-2">Created By</label>
                    <input
                      id="wage-created-by"
                      type="text"
                      value={wageForm.createdBy}
                      onChange={(event) => setWageForm({ ...wageForm, createdBy: event.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="wage-description" className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      id="wage-description"
                      type="text"
                      value={wageForm.description}
                      onChange={(event) => setWageForm({ ...wageForm, description: event.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button type="submit" className="md:col-span-2 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold">
                    Create Wage Config
                  </button>
                </form>
              </div>
            )}

            {wageLoading ? (
              <div className="text-center py-12 text-gray-600">Loading wage configs...</div>
            ) : wageConfigs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Wage Configs Yet</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wageConfigs.map((config) => (
                  <div key={config.id} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-green-800">{config.roleType}</h3>
                    <p className="text-sm text-gray-600">Rate: {config.ratePerKg} per kg</p>
                    <p className="text-sm text-gray-600">Effective: {config.effectiveDate}</p>
                    {config.description && <p className="text-sm text-gray-600">{config.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
