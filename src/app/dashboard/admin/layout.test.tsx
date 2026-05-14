import { render, screen } from '@testing-library/react';
import AdminLayout from './layout';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { user: { role: string } | null } = { user: { role: 'ADMIN' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: { role: 'ADMIN' } };
  });

  it('renders children when the user is an ADMIN', () => {
    render(
      <AdminLayout>
        <p>admin content</p>
      </AdminLayout>
    );

    expect(screen.getByText('admin content')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redirects non-admins to /dashboard and shows the access-denied screen', () => {
    mockAuth = { user: { role: 'BURUH' } };

    render(
      <AdminLayout>
        <p>admin content</p>
      </AdminLayout>
    );

    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
  });

  it('renders the access-denied screen when there is no user', () => {
    mockAuth = { user: null };

    render(
      <AdminLayout>
        <p>admin content</p>
      </AdminLayout>
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
