import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PayrollPage from './page';
import { employeeService, payrollService } from '@/services/payroll.service';
import { authService } from '@/services/auth.service';
import type { Employee, Payroll } from '@/types';

const pushMock = jest.fn();
const routerMock = { push: pushMock };
const confirmMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/payroll.service', () => ({
  employeeService: {
    getAll: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  payrollService: {
    getAll: jest.fn(),
    create: jest.fn(),
    approve: jest.fn(),
    pay: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
  },
}));

const makeEmployee = (overrides: Partial<Employee> = {}): Employee => ({
  id: 1,
  name: 'Budi',
  employeeCode: 'EMP001',
  position: 'Harvester',
  baseSalary: 5000000,
  status: 'ACTIVE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const makePayroll = (overrides: Partial<Payroll> = {}): Payroll => ({
  id: 10,
  employeeId: 1,
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

const fillEmployeeForm = (container: HTMLElement, overrides: Partial<{ plantationId: string; phoneNumber: string; address: string }> = {}) => {
  fireEvent.click(screen.getByRole('button', { name: /add employee/i }));

  const textInputs = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
  fireEvent.change(textInputs[0], { target: { value: 'Budi' } });
  fireEvent.change(textInputs[1], { target: { value: 'EMP001' } });
  fireEvent.change(textInputs[2], { target: { value: 'Harvester' } });
  if (overrides.phoneNumber !== undefined) fireEvent.change(textInputs[3], { target: { value: overrides.phoneNumber } });
  if (overrides.address !== undefined) fireEvent.change(textInputs[4], { target: { value: overrides.address } });

  const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
  fireEvent.change(numberInputs[0], { target: { value: '5000000' } });
  if (overrides.plantationId !== undefined) fireEvent.change(numberInputs[1], { target: { value: overrides.plantationId } });

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ACTIVE' } });
};

const fillPayrollForm = (container: HTMLElement, overrides: Partial<{ notes: string }> = {}) => {
  fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));

  const numberInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
  fireEvent.change(numberInputs[0], { target: { value: '1' } });
  fireEvent.change(numberInputs[1], { target: { value: '5000000' } });
  fireEvent.change(numberInputs[2], { target: { value: '200000' } });
  fireEvent.change(numberInputs[3], { target: { value: '100000' } });

  const dateInputs = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
  fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
  fireEvent.change(dateInputs[1], { target: { value: '2026-01-31' } });

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'BANK_TRANSFER' } });

  if (overrides.notes !== undefined) {
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(textInput, { target: { value: overrides.notes } });
  }
};

describe('PayrollPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (employeeService.getAll as jest.Mock).mockResolvedValue([]);
    (employeeService.create as jest.Mock).mockResolvedValue({ id: 1 });
    (employeeService.delete as jest.Mock).mockResolvedValue(undefined);
    (payrollService.getAll as jest.Mock).mockResolvedValue([]);
    (payrollService.create as jest.Mock).mockResolvedValue({ id: 10 });
    (payrollService.approve as jest.Mock).mockResolvedValue({ id: 10, status: 'APPROVED' });
    (payrollService.pay as jest.Mock).mockResolvedValue({ id: 10, status: 'PAID' });
    (payrollService.delete as jest.Mock).mockResolvedValue(undefined);
    confirmMock.mockReturnValue(true);
  });

  it('redirects to login when user is not authenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
    render(<PayrollPage />);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(employeeService.getAll).not.toHaveBeenCalled();
    expect(payrollService.getAll).not.toHaveBeenCalled();
  });

  // ── Employees tab ──

  it('shows employees loading state then empty state', async () => {
    let resolveEmps: ((value: unknown) => void) | undefined;
    (employeeService.getAll as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveEmps = resolve; }));
    render(<PayrollPage />);
    expect(screen.getByText(/loading employees/i)).toBeInTheDocument();
    resolveEmps?.([]);
    expect(await screen.findByText(/no employees yet/i)).toBeInTheDocument();
  });

  it('renders employees list with all status colors and optional fields', async () => {
    (employeeService.getAll as jest.Mock).mockResolvedValue([
      makeEmployee({ id: 1, name: 'Active Emp', status: 'ACTIVE', plantationId: 3, phoneNumber: '0812' }),
      makeEmployee({ id: 2, name: 'Inactive Emp', status: 'INACTIVE' }),
      makeEmployee({ id: 3, name: 'Terminated Emp', status: 'TERMINATED' }),
      makeEmployee({ id: 4, name: 'Unknown Emp', status: 'WEIRD' as unknown as Employee['status'] }),
    ]);
    render(<PayrollPage />);
    expect(await screen.findByText('Active Emp')).toBeInTheDocument();
    expect(screen.getByText('Inactive Emp')).toBeInTheDocument();
    expect(screen.getByText('Terminated Emp')).toBeInTheDocument();
    expect(screen.getByText('Unknown Emp')).toBeInTheDocument();
    expect(screen.getByText('0812')).toBeInTheDocument();
  });

  it('shows employee load error from Error', async () => {
    (employeeService.getAll as jest.Mock).mockRejectedValue(new Error('Employee API down'));
    render(<PayrollPage />);
    expect(await screen.findByText('Employee API down')).toBeInTheDocument();
  });

  it('shows fallback employee load error when thrown value is not Error', async () => {
    (employeeService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    expect(await screen.findByText('Failed to load employees')).toBeInTheDocument();
  });

  it('toggles add employee form visibility', async () => {
    render(<PayrollPage />);
    await screen.findByText(/no employees yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
  });

  it('creates employee with optional fields populated', async () => {
    (employeeService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no employees yet/i);
    fillEmployeeForm(container, { plantationId: '3', phoneNumber: '0812', address: 'Pekanbaru' });
    fireEvent.click(screen.getByRole('button', { name: /create employee/i }));

    await waitFor(() => {
      expect(employeeService.create).toHaveBeenCalledWith({
        name: 'Budi',
        employeeCode: 'EMP001',
        position: 'Harvester',
        plantationId: 3,
        phoneNumber: '0812',
        address: 'Pekanbaru',
        baseSalary: 5000000,
        status: 'ACTIVE',
      });
    });
    await waitFor(() => {
      expect((employeeService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('creates employee with undefined optional fields when blank', async () => {
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no employees yet/i);
    fillEmployeeForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create employee/i }));

    await waitFor(() => {
      expect(employeeService.create).toHaveBeenCalledWith({
        name: 'Budi',
        employeeCode: 'EMP001',
        position: 'Harvester',
        plantationId: undefined,
        phoneNumber: undefined,
        address: undefined,
        baseSalary: 5000000,
        status: 'ACTIVE',
      });
    });
  });

  it('shows create employee error from Error', async () => {
    (employeeService.create as jest.Mock).mockRejectedValue(new Error('Employee create failed'));
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no employees yet/i);
    fillEmployeeForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create employee/i }));
    expect(await screen.findByText('Employee create failed')).toBeInTheDocument();
  });

  it('shows fallback create employee error when thrown value is not Error', async () => {
    (employeeService.create as jest.Mock).mockRejectedValue('bad');
    const { container } = render(<PayrollPage />);
    await screen.findByText(/no employees yet/i);
    fillEmployeeForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create employee/i }));
    expect(await screen.findByText('Failed to create employee')).toBeInTheDocument();
  });

  it('does not delete employee when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (employeeService.getAll as jest.Mock).mockResolvedValue([makeEmployee()]);
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(employeeService.delete).not.toHaveBeenCalled();
  });

  it('deletes employee and reloads list when confirmed', async () => {
    (employeeService.getAll as jest.Mock)
      .mockResolvedValueOnce([makeEmployee()])
      .mockResolvedValueOnce([]);
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => expect(employeeService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => {
      expect((employeeService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows delete employee error from Error', async () => {
    (employeeService.getAll as jest.Mock).mockResolvedValue([makeEmployee()]);
    (employeeService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete employee error when thrown value is not Error', async () => {
    (employeeService.getAll as jest.Mock).mockResolvedValue([makeEmployee()]);
    (employeeService.delete as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Failed to delete employee')).toBeInTheDocument();
  });

  // ── Payrolls tab ──

  it('switches back to employees tab after viewing payrolls', async () => {
    render(<PayrollPage />);
    await screen.findByText(/no employees yet/i);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    await screen.findByText(/no payroll records yet/i);
    fireEvent.click(screen.getByRole('button', { name: /employees/i }));
    expect(await screen.findByText(/no employees yet/i)).toBeInTheDocument();
  });

  it('switches to payrolls tab and shows loading then empty state', async () => {
    let resolvePay: ((value: unknown) => void) | undefined;
    (payrollService.getAll as jest.Mock).mockReturnValue(new Promise((resolve) => { resolvePay = resolve; }));
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    expect(screen.getByText(/loading payrolls/i)).toBeInTheDocument();
    resolvePay?.([]);
    expect(await screen.findByText(/no payroll records yet/i)).toBeInTheDocument();
  });

  it('renders payrolls list with all status colors and approve/pay action buttons', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    expect(await screen.findByText('Payroll #10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as paid/i })).toBeInTheDocument();
  });

  it('renders payroll without optional paymentMethod gracefully', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([
      makePayroll({ paymentMethod: undefined }),
    ]);
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    expect(await screen.findByText('Payroll #10')).toBeInTheDocument();
    expect(screen.queryByText(/Method:/)).not.toBeInTheDocument();
  });

  it('shows payroll load error from Error', async () => {
    (payrollService.getAll as jest.Mock).mockRejectedValue(new Error('Payroll API down'));
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    expect(await screen.findByText('Payroll API down')).toBeInTheDocument();
  });

  it('shows fallback payroll load error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    expect(await screen.findByText('Failed to load payrolls')).toBeInTheDocument();
  });

  it('toggles add payroll form visibility', async () => {
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    await screen.findByText(/no payroll records yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add payroll/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /add payroll/i })).toBeInTheDocument();
  });

  it('creates payroll with optional notes populated', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const { container } = render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    await screen.findByText(/no payroll records yet/i);
    fillPayrollForm(container, { notes: 'on-time bonus' });
    fireEvent.click(screen.getByRole('button', { name: /create payroll/i }));

    await waitFor(() => {
      expect(payrollService.create).toHaveBeenCalledWith({
        employeeId: 1,
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
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    await screen.findByText(/no payroll records yet/i);
    fillPayrollForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create payroll/i }));

    await waitFor(() => {
      expect(payrollService.create).toHaveBeenCalledWith(expect.objectContaining({
        notes: undefined,
      }));
    });
  });

  it('shows create payroll error from Error', async () => {
    (payrollService.create as jest.Mock).mockRejectedValue(new Error('Payroll create failed'));
    const { container } = render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    await screen.findByText(/no payroll records yet/i);
    fillPayrollForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create payroll/i }));
    expect(await screen.findByText('Payroll create failed')).toBeInTheDocument();
  });

  it('shows fallback create payroll error when thrown value is not Error', async () => {
    (payrollService.create as jest.Mock).mockRejectedValue('bad');
    const { container } = render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    await screen.findByText(/no payroll records yet/i);
    fillPayrollForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create payroll/i }));
    expect(await screen.findByText('Failed to create payroll')).toBeInTheDocument();
  });

  it('approves a pending payroll and reloads', async () => {
    (payrollService.getAll as jest.Mock)
      .mockResolvedValueOnce([makePayroll({ status: 'PENDING' })])
      .mockResolvedValueOnce([makePayroll({ status: 'APPROVED' })]);
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    fireEvent.click(await screen.findByRole('button', { name: /approve/i }));
    expect(await screen.findByText('Approve failed')).toBeInTheDocument();
  });

  it('shows fallback approve error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PENDING' })]);
    (payrollService.approve as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    fireEvent.click(await screen.findByRole('button', { name: /approve/i }));
    expect(await screen.findByText('Failed to approve payroll')).toBeInTheDocument();
  });

  it('pays an approved payroll and reloads', async () => {
    (payrollService.getAll as jest.Mock)
      .mockResolvedValueOnce([makePayroll({ status: 'APPROVED' })])
      .mockResolvedValueOnce([makePayroll({ status: 'PAID' })]);
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark as paid/i }));
    expect(await screen.findByText('Pay failed')).toBeInTheDocument();
  });

  it('shows fallback pay error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'APPROVED' })]);
    (payrollService.pay as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    fireEvent.click(await screen.findByRole('button', { name: /mark as paid/i }));
    expect(await screen.findByText('Failed to mark payroll as paid')).toBeInTheDocument();
  });

  it('does not delete payroll when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PAID' })]);
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(payrollService.delete).not.toHaveBeenCalled();
  });

  it('deletes payroll and reloads list when confirmed', async () => {
    (payrollService.getAll as jest.Mock)
      .mockResolvedValueOnce([makePayroll({ status: 'PAID' })])
      .mockResolvedValueOnce([]);
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete payroll error when thrown value is not Error', async () => {
    (payrollService.getAll as jest.Mock).mockResolvedValue([makePayroll({ status: 'PAID' })]);
    (payrollService.delete as jest.Mock).mockRejectedValue('bad');
    render(<PayrollPage />);
    fireEvent.click(screen.getByRole('button', { name: /payrolls/i }));
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Failed to delete payroll')).toBeInTheDocument();
  });
});
