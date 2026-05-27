import { render, screen } from '@testing-library/react';
import { RequireRole } from './RequireRole';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { user: { role: string } | null } = { user: null };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('RequireRole', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: null };
  });

  it('renders the access-denied panel when there is no user', () => {
    render(
      <RequireRole allow={['ADMIN']}>
        <p>secret</p>
      </RequireRole>,
    );
    expect(screen.getByText(/akses ditolak/i)).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders children when the user has an allowed role', () => {
    mockAuth = { user: { role: 'ADMIN' } };
    render(
      <RequireRole allow={['ADMIN', 'MANDOR']}>
        <p>secret</p>
      </RequireRole>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects to /dashboard and shows access denied when the role is not allowed', () => {
    mockAuth = { user: { role: 'BURUH' } };
    render(
      <RequireRole allow={['ADMIN']}>
        <p>secret</p>
      </RequireRole>,
    );
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByText(/akses ditolak/i)).toBeInTheDocument();
  });
});
