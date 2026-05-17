import { fireEvent, render, screen } from '@testing-library/react';
import DashboardLayout from './layout';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();

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
    getUserInfo: jest.fn(),
    logout: jest.fn(),
  },
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with username and a settings link, logs out via the button', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({
      id: '1', username: 'budi', email: 'b@mail.com', role: 'BURUH', googleLinked: false, hasPassword: true,
    });

    render(
      <DashboardLayout>
        <p>inner</p>
      </DashboardLayout>
    );

    expect(screen.getByText(/welcome, budi/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /mysawit dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/dashboard/settings');
    expect(screen.getByText('inner')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('redirects unauthenticated users via the wrapped AuthProvider', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    render(
      <DashboardLayout>
        <p>inner</p>
      </DashboardLayout>
    );

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
