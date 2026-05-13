import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

let mockAuth: { isAdmin: boolean } = { isAdmin: false };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    mockAuth = { isAdmin: false };
  });

  it('renders module cards linking to each domain', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('link', { name: /plantations/i })).toHaveAttribute('href', '/dashboard/plantations');
    expect(screen.getByRole('link', { name: /harvests/i })).toHaveAttribute('href', '/dashboard/harvests');
    expect(screen.getByRole('link', { name: /shipments/i })).toHaveAttribute('href', '/dashboard/shipments');
    expect(screen.getByRole('link', { name: /payroll/i })).toHaveAttribute('href', '/dashboard/payroll');
    expect(screen.getByRole('link', { name: /identity/i })).toHaveAttribute('href', '/dashboard/identity');
  });

  it('hides the User Admin card for non-admin users', () => {
    mockAuth = { isAdmin: false };
    render(<DashboardPage />);
    expect(screen.queryByRole('link', { name: /user admin/i })).not.toBeInTheDocument();
  });

  it('shows the User Admin card for admin users', () => {
    mockAuth = { isAdmin: true };
    render(<DashboardPage />);
    expect(screen.getByRole('link', { name: /user admin/i })).toHaveAttribute('href', '/dashboard/admin/users');
  });

  it('renders the system status panel', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/system status/i)).toBeInTheDocument();
    expect(screen.getAllByText(/online/i).length).toBeGreaterThanOrEqual(5);
  });
});
