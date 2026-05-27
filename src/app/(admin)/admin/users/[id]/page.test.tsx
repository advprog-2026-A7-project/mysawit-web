import { render, screen, waitFor } from '@testing-library/react';
import AdminUserDetailPage from './page';
import { adminService } from '@/services/admin.service';
import { payrollService } from '@/services/payroll.service';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'user-1' }),
}));

jest.mock('@/services/admin.service', () => ({
  adminService: {
    getUserById: jest.fn(),
  },
}));

jest.mock('@/services/payroll.service', () => ({
  payrollService: {
    getUserHistory: jest.fn(),
  },
}));

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (payrollService.getUserHistory as jest.Mock).mockResolvedValue([]);
  });

  it('loads and renders admin user detail', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue({
      id: 'user-1',
      username: 'budi',
      name: 'Budi',
      email: 'budi@mail.com',
      role: 'BURUH',
      googleLinked: true,
      hasPassword: true,
      createdAt: '2026-05-01T10:00:00',
      mandorId: 'mandor-1',
      certificationNumber: null,
      kebunId: 'kebun-1',
    });

    render(<AdminUserDetailPage />);

    expect(screen.getByText(/memuat detail pengguna/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(adminService.getUserById).toHaveBeenCalledWith('user-1');
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Budi' })).toBeInTheDocument();
    expect(screen.getAllByText('budi@mail.com').length).toBeGreaterThan(0);
    expect(screen.getByText('BURUH')).toBeInTheDocument();
    expect(screen.getByText('mandor-1')).toBeInTheDocument();
    expect(screen.getByText('kebun-1')).toBeInTheDocument();
    expect(payrollService.getUserHistory).toHaveBeenCalledWith('user-1', {
      from: undefined,
      to: undefined,
      status: undefined,
    });
    expect(screen.getByRole('link', { name: /kembali ke pengguna/i })).toHaveAttribute('href', '/admin/users');
  });

  it('renders payroll history for the selected user', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue({
      id: 'user-1',
      username: 'budi',
      name: 'Budi',
      email: 'budi@mail.com',
      role: 'BURUH',
      googleLinked: false,
      hasPassword: true,
      createdAt: '2026-05-01T10:00:00',
    });
    (payrollService.getUserHistory as jest.Mock).mockResolvedValue([
      {
        id: 12,
        userId: 'user-1',
        periodStart: '2026-05-01T00:00:00',
        periodEnd: '2026-05-31T23:59:59',
        baseAmount: 1000000,
        bonusAmount: 100000,
        deductionAmount: 0,
        totalAmount: 1100000,
        status: 'PAID',
        createdAt: '2026-05-31T23:59:59',
        updatedAt: '2026-05-31T23:59:59',
      },
    ]);

    render(<AdminUserDetailPage />);

    expect(await screen.findByRole('heading', { level: 2, name: /history gaji/i })).toBeInTheDocument();
    expect(await screen.findByText('Gaji #12')).toBeInTheDocument();
    expect(screen.getAllByText('Dibayar').length).toBeGreaterThan(0);
    expect(screen.getByText(/Rp.*1\.100\.000/)).toBeInTheDocument();
  });

  it('shows an error when loading user detail fails', async () => {
    (adminService.getUserById as jest.Mock).mockRejectedValue(new Error('User not found'));

    render(<AdminUserDetailPage />);

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });
});
