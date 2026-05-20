import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    getUserInfo: jest.fn(),
    logout: jest.fn(),
  },
}));

function Probe() {
  const { user, isAdmin, logout } = useAuth();
  return (
    <div>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="isAdmin">{String(isAdmin)}</span>
      <span data-testid="googleLinked">{String(user?.googleLinked)}</span>
      <span data-testid="hasPassword">{String(user?.hasPassword)}</span>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes user info from authService and redirects unauthenticated users to /login', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
  });

  it('renders user info and flags ADMIN role', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({
      id: '1', username: 'root', email: 'root@mail.com', role: 'ADMIN', googleLinked: true, hasPassword: true,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('username')).toHaveTextContent('root');
    expect(screen.getByTestId('role')).toHaveTextContent('ADMIN');
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
    expect(screen.getByTestId('googleLinked')).toHaveTextContent('true');
    expect(screen.getByTestId('hasPassword')).toHaveTextContent('true');
  });

  it('falls back to empty strings when authService returns sparse user info', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({
      id: null, username: null, email: null, role: null, googleLinked: false, hasPassword: false,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('username')).toHaveTextContent('');
    expect(screen.getByTestId('isAdmin')).toHaveTextContent('false');
  });

  it('renders without user when authService.getUserInfo returns null', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue(null);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId('username')).toHaveTextContent('none');
  });

  it('logout calls authService.logout and redirects to /', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({
      id: '1', username: 'budi', email: 'b@mail.com', role: 'BURUH', googleLinked: false, hasPassword: true,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('logout').click();
    });

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('useAuth returns the default no-op context when called outside a provider', () => {
    function StandaloneProbe() {
      const ctx = useAuth();
      ctx.logout();
      return <span data-testid="standalone">{String(ctx.isAdmin)}</span>;
    }

    render(<StandaloneProbe />);

    expect(screen.getByTestId('standalone')).toHaveTextContent('false');
  });
});
