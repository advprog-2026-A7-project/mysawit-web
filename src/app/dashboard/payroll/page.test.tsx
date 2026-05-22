import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PayrollPage from './page';
import { authService } from '@/services/auth.service';
import { payrollService, wageConfigService, walletService } from '@/services/payroll.service';
import type { Payroll, WageConfig, Wallet } from '@/types';

const pushMock = jest.fn();
const confirmMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
  },
}));

jest.mock('@/services/payroll.service', () => ({
  payrollService: {
    getAll: jest.fn(),
    create: jest.fn(),
    approve: jest.fn(),
    pay: jest.fn(),
    delete: jest.fn(),
  },
  walletService: {
    getByUser: jest.fn(),
    topUpSandbox: jest.fn(),
  },
  wageConfigService: {
    getAll: jest.fn(),
    create: jest.fn(),
  },
}));

const makePayroll = (overrides: Partial<Payroll> = {}): Payroll => ({
  id: 10,
  userId: 'worker-1',
  roleType: 'BURUH',
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  baseAmount: 5000000,
  bonusAmount: 200000,
  deductionAmount: 100000,
  totalAmount: 5100000,
  status: 'PENDING',
  paymentMethod: 'SANDBOX',
  walletTransferAmount: 510,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const makeWallet = (overrides: Partial<Wallet> = {}): Wallet => ({
  id: 1,
  userId: 'admin',
  balance: 100,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const makeWageConfig = (overrides: Partial<WageConfig> = {}): WageConfig => ({
  id: 1,
  roleType: 'BURUH',
  ratePerKg: 350,
  effectiveDate: '2026-01-01',
  description: 'Harvest wage',
  createdBy: 'admin',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const fillPayrollForm = (container: HTMLElement, notes = 'monthly payroll') => {
  fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));
  const textInputs = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
  const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
  const dateInputs = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
  const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];

  fireEvent.change(textInputs[0], { target: { value: 'worker-1' } });
  fireEvent.change(selects[0], { target: { value: 'BURUH' } });
  fireEvent.change(numberInputs[0], { target: { value: '5000000' } });
  fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
  fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } });
  fireEvent.change(numberInputs[1], { target: { value: '200000' } });
  fireEvent.change(numberInputs[2], { target: { value: '100000' } });
  fireEvent.change(selects[1], { target: { value: 'SANDBOX' } });
  fireEvent.change(textInputs[1], { target: { value: notes } });
};

const fillWageForm = (container: HTMLElement, description = 'Harvest wage') => {
  fireEvent.click(screen.getByRole('button', { name: /add wage config/i }));
  const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement;
  const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
  const textInputs = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
  const select = container.querySelector('select') as HTMLSelectElement;

  fireEvent.change(select, { target: { value: 'BURUH' } });
  fireEvent.change(numberInput, { target: { value: '350' } });
  fireEvent.change(dateInput, { target: { value: '2026-01-01' } });
  fireEvent.change(textInputs[0], { target: { value: 'admin' } });
  fireEvent.change(textInputs[1], { target: { value: description } });
};

describe('PayrollPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    confirmMock.mockReturnValue(true);
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (payrollService.getAll as jest.Mock).mockResolvedValue([]);
    (payrollService.create as jest.Mock).mockResolvedValue({ id: 10 });
    (payrollService.approve as jest.Mock).mockResolvedValue({ id: 10, status: 'APPROVED' });
    (payrollService.pay as jest.Mock).mockResolvedValue({ id: 10, status: 'PAID' });
    (payrollService.delete as jest.Mock).mockResolvedValue(undefined);
    (walletService.getByUser as jest.Mock).mockResolvedValue(makeWallet());
    (walletService.topUpSandbox as jest.Mock).mockResolvedValue({ id: 2 });
    (wageConfigService.getAll as jest.Mock).mockResolvedValue([]);
    (wageConfigService.create as jest.Mock).mockResolvedValue({ id: 1 });
  });

  it('redirects to login when unauthenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<PayrollPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(payrollService.getAll).not.toHaveBeenCalled();
    expect(wageConfigService.getAll).not.toHaveBeenCalled();
  });

  it('loads payrolls and renders status actions', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([
      makePayroll({ id: 10, status: 'PENDING' }),
      makePayroll({ id: 11, status: 'APPROVED', walletTransferAmount: undefined }),
      makePayroll({ id: 12, status: 'ACCEPTED', roleType: undefined }),
      makePayroll({ id: 13, status: 'REJECTED' }),
      makePayroll({ id: 14, status: 'PAID' }),
      makePayroll({ id: 15, status: 'CANCELLED' }),
      makePayroll({ id: 16, status: 'WEIRD' as Payroll['status'] }),
    ]);

    render(<PayrollPage />);

    expect(await screen.findByText('Payroll #10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as paid/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(7);
  });

  it('shows payroll loading, empty, and load errors', async () => {
    let resolvePayrolls: ((value: Payroll[]) => void) | undefined;
    (payrollService.getAll as jest.Mock).mockReturnValue(new Promise((resolve) => { resolvePayrolls = resolve; }));
    const { unmount } = render(<PayrollPage />);
    expect(screen.getByText(/loading payrolls/i)).toBeInTheDocument();
    resolvePayrolls?.([]);
    expect(await screen.findByText(/no payroll records yet/i)).toBeInTheDocument();
    unmount();

    (payrollService.getAll as jest.Mock).mockRejectedValue(new Error('Payroll API down'));
    render(<PayrollPage />);
    expect(await screen.findByText('Payroll API down')).toBeInTheDocument();
  });

  it('creates payroll and reloads', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const { container } = render(<PayrollPage />);

    await screen.findByText(/no payroll records yet/i);
    fillPayrollForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create payroll/i }));

    await waitFor(() => expect(payrollService.create).toHaveBeenCalledWith({
      userId: 'worker-1',
      roleType: 'BURUH',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      baseAmount: 5000000,
      bonusAmount: 200000,
      deductionAmount: 100000,
      paymentMethod: 'SANDBOX',
      notes: 'monthly payroll',
      status: 'PENDING',
    }));
    await waitFor(() => expect((payrollService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('creates payroll with undefined notes and handles create error fallback', async () => {
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    fillPayrollForm(container, '');
    fireEvent.click(screen.getByRole('button', { name: /create payroll/i }));
    await waitFor(() => expect(payrollService.create).toHaveBeenCalledWith(expect.objectContaining({ notes: undefined })));

    (payrollService.create as jest.Mock).mockRejectedValueOnce('bad');
    fillPayrollForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create payroll/i }));
    expect(await screen.findByText('Failed to create payroll')).toBeInTheDocument();
  });

  it('approves, pays, and deletes payroll records', async () => {
    let payrollStatus: Payroll['status'] = 'PENDING';
    (payrollService.getAll as jest.Mock).mockImplementation(() => Promise.resolve([makePayroll({ status: payrollStatus })]));
    (payrollService.approve as jest.Mock).mockImplementation(() => {
      payrollStatus = 'APPROVED';
      return Promise.resolve({ id: 10, status: 'APPROVED' });
    });
    (payrollService.pay as jest.Mock).mockImplementation(() => {
      payrollStatus = 'PAID';
      return Promise.resolve({ id: 10, status: 'PAID' });
    });

    render(<PayrollPage />);
    expect(await screen.findByText('Payroll #10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(payrollService.approve).toHaveBeenCalledWith(10));
    fireEvent.click(await screen.findByRole('button', { name: /mark as paid/i }));
    await waitFor(() => expect(payrollService.pay).toHaveBeenCalledWith(10, 'SANDBOX'));
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => expect(payrollService.delete).toHaveBeenCalledWith(10));
  });

  it('does not delete when cancelled and shows action errors', async () => {
    confirmMock.mockReturnValue(false);
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll()]);
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(payrollService.delete).not.toHaveBeenCalled();

    (payrollService.approve as jest.Mock).mockRejectedValueOnce('bad');
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    expect(await screen.findByText('Failed to approve payroll')).toBeInTheDocument();
  });

  it('shows pay and delete errors', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'APPROVED' })]);
    (payrollService.pay as jest.Mock).mockRejectedValueOnce(new Error('Pay failed'));
    render(<PayrollPage />);

    fireEvent.click(await screen.findByRole('button', { name: /mark as paid/i }));
    expect(await screen.findByText('Pay failed')).toBeInTheDocument();

    (payrollService.delete as jest.Mock).mockRejectedValueOnce('bad');
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Failed to delete payroll')).toBeInTheDocument();
  });

  it('loads and tops up wallets', async () => {
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /wallets/i }));
    fireEvent.click(screen.getByRole('button', { name: /^payrolls$/i }));
    fireEvent.click(screen.getByRole('button', { name: /wallets/i }));
    (walletService.getByUser as jest.Mock).mockResolvedValue(makeWallet({ userId: 'worker-2' }));
    fireEvent.change(screen.getByLabelText(/wallet user id/i), { target: { value: 'worker-2' } });
    fireEvent.click(screen.getByRole('button', { name: /load wallet/i }));
    expect(await screen.findByText('Wallet worker-2')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/sawit dollar amount/i), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /top up wallet/i }));
    await waitFor(() => expect(walletService.topUpSandbox).toHaveBeenCalledWith('worker-2', {
      amountSawitDollar: 25,
      gateway: 'SANDBOX',
    }));
  });

  it('shows wallet error fallbacks', async () => {
    (walletService.getByUser as jest.Mock).mockRejectedValueOnce('bad');
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /wallets/i }));
    fireEvent.click(screen.getByRole('button', { name: /load wallet/i }));
    expect(await screen.findByText('Failed to load wallet')).toBeInTheDocument();

    (walletService.topUpSandbox as jest.Mock).mockRejectedValueOnce(new Error('Topup down'));
    fireEvent.click(screen.getByRole('button', { name: /top up wallet/i }));
    expect(await screen.findByText('Topup down')).toBeInTheDocument();
  });

  it('loads and creates wage configs', async () => {
    (wageConfigService.getAll as jest.Mock).mockResolvedValue([makeWageConfig()]);
    const { container } = render(<PayrollPage />);

    fireEvent.click(screen.getByRole('button', { name: /wage configs/i }));
    expect(await screen.findByText('Harvest wage')).toBeInTheDocument();
    fillWageForm(container);
    fireEvent.change(screen.getByLabelText(/created by/i), { target: { value: 'owner' } });
    fireEvent.click(screen.getByRole('button', { name: /create wage config/i }));

    await waitFor(() => expect(wageConfigService.create).toHaveBeenCalledWith({
      roleType: 'BURUH',
      ratePerKg: 350,
      effectiveDate: '2026-01-01',
      description: 'Harvest wage',
      createdBy: 'owner',
    }));
  });

  it('shows wage config empty and error states', async () => {
    (wageConfigService.getAll as jest.Mock).mockResolvedValue([]);
    const { unmount } = render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /wage configs/i }));
    expect(await screen.findByText(/no wage configs yet/i)).toBeInTheDocument();
    unmount();

    (wageConfigService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /wage configs/i }));
    expect(await screen.findByText('Failed to load wage configs')).toBeInTheDocument();
  });

  it('handles wage config create fallback error and blank optional fields', async () => {
    (wageConfigService.create as jest.Mock).mockResolvedValueOnce({ id: 1 }).mockRejectedValueOnce('bad');
    const { container } = render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /wage configs/i }));
    await screen.findByText(/no wage configs yet/i);
    fillWageForm(container, '');
    fireEvent.change(screen.getByLabelText(/created by/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /create wage config/i }));
    await waitFor(() => expect(wageConfigService.create).toHaveBeenCalledWith(expect.objectContaining({
      description: undefined,
      createdBy: undefined,
    })));

    fillWageForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create wage config/i }));
    expect(await screen.findByText('Failed to create wage config')).toBeInTheDocument();
  });
});
