import { render, screen, waitFor } from '@testing-library/react';
import AdminUserDetailPage from './page';
import { adminService } from '@/services/admin.service';

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

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(screen.getByText(/loading user detail/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(adminService.getUserById).toHaveBeenCalledWith('user-1');
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Budi' })).toBeInTheDocument();
    expect(screen.getAllByText('budi@mail.com').length).toBeGreaterThan(0);
    expect(screen.getByText('BURUH')).toBeInTheDocument();
    expect(screen.getByText('mandor-1')).toBeInTheDocument();
    expect(screen.getByText('kebun-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to users/i })).toHaveAttribute('href', '/admin/users');
  });

  it('shows an error when loading user detail fails', async () => {
    (adminService.getUserById as jest.Mock).mockRejectedValue(new Error('User not found'));

    render(<AdminUserDetailPage />);

    expect(await screen.findByText('User not found')).toBeInTheDocument();
  });
});
