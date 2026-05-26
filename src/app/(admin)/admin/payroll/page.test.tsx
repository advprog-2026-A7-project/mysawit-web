import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PayrollPage from './page';
import { adminService } from '@/services/admin.service';
import { authService } from '@/services/auth.service';
import { payrollService, wageConfigService, walletService } from '@/services/payroll.service';

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/admin.service', () => ({
  adminService: {
    getUsers: jest.fn(),
  },
}));

jest.mock('@/services/payroll.service', () => ({
  payrollService: {
    getAll: jest.fn(),
    create: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    pay: jest.fn(),
    delete: jest.fn(),
  },
  wageConfigService: {
    getAll: jest.fn(),
    create: jest.fn(),
  },
  walletService: {
    getWallet: jest.fn(),
    getTransactions: jest.fn(),
    topUpSandbox: jest.fn(),
    settleSandbox: jest.fn(),
  },
}));

const pendingPayroll = {
  id: 12,
  userId: 'buruh-1',
  roleType: 'BURUH',
  sourceType: 'NEGATIVE_TEST',
  kilograms: 10,
  periodStart: '2026-05-01T00:00:00',
  periodEnd: '2026-05-31T23:59:59',
  baseAmount: 10000,
  bonusAmount: 0,
  deductionAmount: 0,
  totalAmount: 10000,
  status: 'PENDING' as const,
  createdAt: '2026-05-26T00:00:00',
  updatedAt: '2026-05-26T00:00:00',
};

describe('Admin payroll negative guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: 'admin-1', role: 'ADMIN' });
    (payrollService.getAll as jest.Mock).mockResolvedValue([pendingPayroll]);
    (wageConfigService.getAll as jest.Mock).mockResolvedValue([]);
    (walletService.getWallet as jest.Mock).mockResolvedValue({ id: 1, userId: 'admin-1', balance: 0 });
    (walletService.getTransactions as jest.Mock).mockResolvedValue([]);
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      {
        id: 'buruh-1',
        username: 'buruh',
        email: 'buruh@example.test',
        name: 'Buruh Test',
        role: 'BURUH',
        createdAt: '2026-05-26T00:00:00',
      },
    ]);
  });

  it('blocks rejecting payroll without a reason before calling the API', async () => {
    jest.spyOn(window, 'prompt').mockReturnValue('   ');

    render(<PayrollPage />);

    await screen.findByText('Gaji #12');
    fireEvent.click(screen.getByRole('button', { name: 'Tolak' }));

    expect(await screen.findByText('Alasan penolakan gaji wajib diisi')).toBeInTheDocument();
    expect(payrollService.reject).not.toHaveBeenCalled();
  });

  it('keeps insufficient wallet approval as a visible error', async () => {
    (payrollService.approve as jest.Mock).mockRejectedValue(new Error('Insufficient admin wallet balance'));

    render(<PayrollPage />);

    await screen.findByText('Gaji #12');
    fireEvent.click(screen.getByRole('button', { name: 'Setujui' }));

    await waitFor(() => {
      expect(payrollService.approve).toHaveBeenCalledWith(12, 'admin-1');
    });
    expect(await screen.findByText('Insufficient admin wallet balance')).toBeInTheDocument();
  });
});
