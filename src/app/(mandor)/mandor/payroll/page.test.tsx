import { fireEvent, render, screen } from '@testing-library/react';
import MandorPayrollPage from './page';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { payrollService } from '@/services/payroll.service';

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/identity.service', () => ({
  identityService: {
    listUsers: jest.fn(),
  },
}));

jest.mock('@/services/payroll.service', () => ({
  payrollService: {
    getAll: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
  },
}));

const subordinatePayroll = {
  id: 21,
  userId: 'buruh-1',
  roleType: 'BURUH',
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

describe('Mandor payroll negative guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: 'mandor-1', role: 'MANDOR' });
    (payrollService.getAll as jest.Mock).mockResolvedValue([subordinatePayroll]);
    (identityService.listUsers as jest.Mock).mockResolvedValue([
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

  it('blocks rejecting subordinate payroll without a reason', async () => {
    jest.spyOn(window, 'prompt').mockReturnValue(' ');

    render(<MandorPayrollPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tolak' }));

    expect(await screen.findByText('Alasan penolakan gaji wajib diisi')).toBeInTheDocument();
    expect(payrollService.reject).not.toHaveBeenCalled();
  });
});
