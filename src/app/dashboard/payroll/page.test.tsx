import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PayrollPage from './page';
import { payrollService } from '@/services/payroll.service';
import { adminService } from '@/services/admin.service';
import type { Payroll, UserDetailResponse } from '@/types';

const confirmMock = jest.fn();

const USER_ID = '11111111-1111-1111-1111-111111111111';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/payroll.service', () => ({
  payrollService: {
    getAll: jest.fn(),
    create: jest.fn(),
    approve: jest.fn(),
    pay: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/services/admin.service', () => ({
  adminService: {
    getUsers: jest.fn(),
  },
}));

const makeUser = (overrides: Partial<UserDetailResponse> = {}): UserDetailResponse => ({
  id: USER_ID,
  username: 'sari',
  email: 'sari@example.com',
  name: 'Sari Lestari',
  role: 'BURUH',
  googleLinked: false,
  hasPassword: true,
  createdAt: '2026-01-01',
  mandorId: null,
  certificationNumber: null,
  kebunId: null,
  ...overrides,
});

const makePayroll = (overrides: Partial<Payroll> = {}): Payroll => ({
  id: 10,
  userId: USER_ID,
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  baseAmount: 5000000,
  bonusAmount: 200000,
  deductionAmount: 100000,
  totalAmount: 5100000,
  status: 'PENDING',
  paymentMethod: 'BANK_TRANSFER',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const fillPayrollForm = (container: HTMLElement, overrides: Partial<{ notes: string }> = {}) => {
  fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));

  // The User <label>/<select> aren't programmatically associated (no htmlFor),
  // so we resolve the user dropdown positionally: it's the first <select> in
  // the form (Payment Method is the second).
  const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
  fireEvent.change(selects[0], { target: { value: USER_ID } });

  const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
  fireEvent.change(numberInputs[0], { target: { value: '5000000' } });
  fireEvent.change(numberInputs[1], { target: { value: '200000' } });
  fireEvent.change(numberInputs[2], { target: { value: '100000' } });

  const dateInputs = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
  fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
  fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } });

  if (overrides.notes !== undefined) {
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(textInput, { target: { value: overrides.notes } });
  }
};

const submitPayrollForm = (container: HTMLElement) => {
  // Use fireEvent.submit on the form to bypass jsdom HTML5 validation, which
  // otherwise blocks fireEvent.click on submit buttons inside forms that have
  // unfilled required fields (e.g., when the user dropdown hasn't hydrated).
  const form = container.querySelector('form') as HTMLFormElement;
  fireEvent.submit(form);
};

describe('PayrollPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    (adminService.getUsers as jest.Mock).mockResolvedValue([makeUser()]);
    (payrollService.getAll as jest.Mock).mockResolvedValue([]);
    (payrollService.create as jest.Mock).mockResolvedValue({ id: 10 });
    (payrollService.approve as jest.Mock).mockResolvedValue({ id: 10, status: 'APPROVED' });
    (payrollService.pay as jest.Mock).mockResolvedValue({ id: 10, status: 'PAID' });
    (payrollService.delete as jest.Mock).mockResolvedValue(undefined);
    confirmMock.mockReturnValue(true);
  });

  it('shows payroll loading state then empty state', async () => {
    let resolvePay: ((value: unknown) => void) | undefined;
    (payrollService.getAll as jest.Mock).mockReturnValue(new Promise((resolve) => { resolvePay = resolve; }));
    render(<PayrollPage />);
    expect(screen.getByText(/loading payrolls/i)).toBeInTheDocument();
    resolvePay?.([]);
    expect(await screen.findByText(/no payroll records yet/i)).toBeInTheDocument();
  });

  it('renders payrolls list with status colors and approve/pay action buttons', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([
      makePayroll({ id: 10, status: 'PENDING' }),
      makePayroll({ id: 11, status: 'APPROVED' }),
      makePayroll({ id: 12, status: 'ACCEPTED' }),
      makePayroll({ id: 13, status: 'REJECTED' }),
      makePayroll({ id: 14, status: 'PAID' }),
      makePayroll({ id: 15, status: 'CANCELLED' }),
      makePayroll({ id: 16, status: 'WEIRD' as unknown as Payroll['status'] }),
    ]);
    render(<PayrollPage />);
    expect(await screen.findByText('Payroll #10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as paid/i })).toBeInTheDocument();
  });

  it('renders the userId verbatim on each payroll card', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll()]);
    render(<PayrollPage />);
    await screen.findByText('Payroll #10');
    expect(screen.getByText(USER_ID)).toBeInTheDocument();
  });

  it('renders payroll without optional paymentMethod gracefully', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([
      makePayroll({ paymentMethod: undefined }),
    ]);
    render(<PayrollPage />);
    expect(await screen.findByText('Payroll #10')).toBeInTheDocument();
    expect(screen.queryByText(/Method:/)).not.toBeInTheDocument();
  });

  it('shows payroll load error from Error', async () => {
    (payrollService.getAll as jest.Mock).mockRejectedValue(new Error('Payroll API down'));
    render(<PayrollPage />);
    expect(await screen.findByText('Payroll API down')).toBeInTheDocument();
  });

  it('shows fallback payroll load error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    expect(await screen.findByText('Failed to load payrolls')).toBeInTheDocument();
  });

  it('toggles add payroll form visibility', async () => {
    render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /add payroll/i })).toBeInTheDocument();
  });

  it('renders user dropdown options sourced from adminService', async () => {
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      makeUser({ id: USER_ID, name: 'Sari Lestari', role: 'BURUH' }),
      makeUser({ id: '22222222-2222-2222-2222-222222222222', username: 'budi', name: '', role: 'MANDOR' }),
    ]);
    render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));
    await screen.findByRole('option', { name: /Sari Lestari \(BURUH\)/ });
    expect(screen.getByRole('option', { name: /budi \(MANDOR\)/ })).toBeInTheDocument();
  });

  it('shows a warning when user list fails to load', async () => {
    (adminService.getUsers as jest.Mock).mockRejectedValue(new Error('Identity API down'));
    render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));
    expect(await screen.findByText(/Identity API down/)).toBeInTheDocument();
  });

  it('shows fallback warning when user list fails with non-Error', async () => {
    (adminService.getUsers as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));
    expect(await screen.findByText(/Failed to load users/)).toBeInTheDocument();
  });

  it('creates payroll with optional notes populated', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    // wait for users to load so the dropdown contains the option
    await screen.findByRole('button', { name: /add payroll/i });
    await waitFor(() => expect((adminService.getUsers as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    fillPayrollForm(container, { notes: 'on-time bonus' });
    submitPayrollForm(container);

    await waitFor(() => {
      expect(payrollService.create).toHaveBeenCalledWith({
        userId: USER_ID,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        baseAmount: 5000000,
        bonusAmount: 200000,
        deductionAmount: 100000,
        paymentMethod: 'BANK_TRANSFER',
        notes: 'on-time bonus',
        status: 'PENDING',
      });
    });
    await waitFor(() => {
      expect((payrollService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('creates payroll with undefined notes when blank', async () => {
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    await waitFor(() => expect((adminService.getUsers as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    fillPayrollForm(container);
    submitPayrollForm(container);

    await waitFor(() => {
      expect(payrollService.create).toHaveBeenCalledWith(expect.objectContaining({
        notes: undefined,
      }));
    });
  });

  it('creates payroll with CASH payment method when the user picks a different option', async () => {
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    await waitFor(() => expect((adminService.getUsers as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    fillPayrollForm(container);
    // The payment method <select> is the second select in the form (after User).
    const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
    fireEvent.change(selects[1], { target: { value: 'CASH' } });
    submitPayrollForm(container);

    await waitFor(() => {
      expect(payrollService.create).toHaveBeenCalledWith(expect.objectContaining({
        paymentMethod: 'CASH',
      }));
    });
  });

  it('shows create payroll error from Error', async () => {
    (payrollService.create as jest.Mock).mockRejectedValue(new Error('Payroll create failed'));
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    await waitFor(() => expect((adminService.getUsers as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    fillPayrollForm(container);
    submitPayrollForm(container);
    expect(await screen.findByText('Payroll create failed')).toBeInTheDocument();
  });

  it('shows fallback create payroll error when thrown value is not Error', async () => {
    (payrollService.create as jest.Mock).mockRejectedValue('bad');
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no payroll records yet/i);
    await waitFor(() => expect((adminService.getUsers as jest.Mock).mock.calls.length).toBeGreaterThan(0));
    fillPayrollForm(container);
    submitPayrollForm(container);
    expect(await screen.findByText('Failed to create payroll')).toBeInTheDocument();
  });

  it('approves a pending payroll and reloads', async () => {
    (payrollService.getAll as jest.Mock)
      .mockResolvedValueOnce([makePayroll({ status: 'PENDING' })])
      .mockResolvedValueOnce([makePayroll({ status: 'APPROVED' })]);
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /approve/i }));
    await waitFor(() => expect(payrollService.approve).toHaveBeenCalledWith(10));
    await waitFor(() => {
      expect((payrollService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows approve error from Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PENDING' })]);
    (payrollService.approve as jest.Mock).mockRejectedValue(new Error('Approve failed'));
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /approve/i }));
    expect(await screen.findByText('Approve failed')).toBeInTheDocument();
  });

  it('shows fallback approve error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PENDING' })]);
    (payrollService.approve as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /approve/i }));
    expect(await screen.findByText('Failed to approve payroll')).toBeInTheDocument();
  });

  it('pays an approved payroll and reloads', async () => {
    (payrollService.getAll as jest.Mock)
      .mockResolvedValueOnce([makePayroll({ status: 'APPROVED' })])
      .mockResolvedValueOnce([makePayroll({ status: 'PAID' })]);
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /mark as paid/i }));
    await waitFor(() => expect(payrollService.pay).toHaveBeenCalledWith(10));
    await waitFor(() => {
      expect((payrollService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows pay error from Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'APPROVED' })]);
    (payrollService.pay as jest.Mock).mockRejectedValue(new Error('Pay failed'));
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /mark as paid/i }));
    expect(await screen.findByText('Pay failed')).toBeInTheDocument();
  });

  it('shows fallback pay error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'APPROVED' })]);
    (payrollService.pay as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /mark as paid/i }));
    expect(await screen.findByText('Failed to mark payroll as paid')).toBeInTheDocument();
  });

  it('does not delete payroll when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PAID' })]);
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(payrollService.delete).not.toHaveBeenCalled();
  });

  it('deletes payroll and reloads list when confirmed', async () => {
    (payrollService.getAll as jest.Mock)
      .mockResolvedValueOnce([makePayroll({ status: 'PAID' })])
      .mockResolvedValueOnce([]);
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => expect(payrollService.delete).toHaveBeenCalledWith(10));
    await waitFor(() => {
      expect((payrollService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows delete payroll error from Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PAID' })]);
    (payrollService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete payroll error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PAID' })]);
    (payrollService.delete as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Failed to delete payroll')).toBeInTheDocument();
  });
});
