import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();
const routerMock = { push: pushMock };

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    getUserInfo: jest.fn(),
    logout: jest.fn(),
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login when user is not authenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    const { container } = render(<DashboardPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders user info and dashboard modules when authenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ username: 'budi', role: 'USER' });

    render(<DashboardPage />);

    expect(await screen.findByText(/welcome, budi/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /plantations/i })).toHaveAttribute('href', '/dashboard/plantations');
    expect(screen.getByRole('link', { name: /harvests/i })).toHaveAttribute('href', '/dashboard/harvests');
    expect(screen.getByRole('link', { name: /shipments/i })).toHaveAttribute('href', '/dashboard/shipments');
    expect(screen.getByRole('link', { name: /payroll/i })).toHaveAttribute('href', '/dashboard/payroll');
  });

  it('handles null user info without crashing', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue(null);

    render(<DashboardPage />);

    expect(await screen.findByText(/welcome,/i)).toBeInTheDocument();
  });

  it('uses fallback empty values when user info fields are empty', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ username: '', role: '' });

    render(<DashboardPage />);

    expect(await screen.findByText('Welcome,')).toBeInTheDocument();
  });

  it('logs out and redirects to home', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ username: 'budi', role: 'USER' });

    render(<DashboardPage />);

    fireEvent.click(await screen.findByRole('button', { name: /logout/i }));

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
