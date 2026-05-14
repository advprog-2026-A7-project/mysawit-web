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

let mockAuth: { user: { role: string } | null; isAdmin: boolean } = {
  user: { role: 'ADMIN' },
  isAdmin: true,
};

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    mockAuth = { user: { role: 'ADMIN' }, isAdmin: true };
  });

  it('shows ADMIN module cards (Identity, Plantations, Shipments, Payroll, User Admin) and hides Harvests', () => {
    render(<DashboardPage />);

    expect(screen.getByRole('link', { name: /identity/i })).toHaveAttribute('href', '/dashboard/identity');
    expect(screen.getByRole('link', { name: /plantations/i })).toHaveAttribute('href', '/dashboard/plantations');
    expect(screen.getByRole('link', { name: /shipments/i })).toHaveAttribute('href', '/dashboard/shipments');
    expect(screen.getByRole('link', { name: /payroll/i })).toHaveAttribute('href', '/dashboard/payroll');
    expect(screen.getByRole('link', { name: /user admin/i })).toHaveAttribute('href', '/dashboard/admin/users');
    expect(screen.queryByRole('link', { name: /harvests/i })).not.toBeInTheDocument();
  });

  it('shows MANDOR cards (Harvests, Shipments, Payroll) and hides Identity, Plantations, User Admin', () => {
    mockAuth = { user: { role: 'MANDOR' }, isAdmin: false };
    render(<DashboardPage />);

    expect(screen.getByRole('link', { name: /harvests/i })).toHaveAttribute('href', '/dashboard/harvests');
    expect(screen.getByRole('link', { name: /shipments/i })).toHaveAttribute('href', '/dashboard/shipments');
    expect(screen.getByRole('link', { name: /payroll/i })).toHaveAttribute('href', '/dashboard/payroll');
    expect(screen.queryByRole('link', { name: /identity/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /plantations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /user admin/i })).not.toBeInTheDocument();
  });

  it('shows SUPIR cards (Shipments, Payroll) only', () => {
    mockAuth = { user: { role: 'SUPIR' }, isAdmin: false };
    render(<DashboardPage />);

    expect(screen.getByRole('link', { name: /shipments/i })).toHaveAttribute('href', '/dashboard/shipments');
    expect(screen.getByRole('link', { name: /payroll/i })).toHaveAttribute('href', '/dashboard/payroll');
    expect(screen.queryByRole('link', { name: /identity/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /plantations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /harvests/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /user admin/i })).not.toBeInTheDocument();
  });

  it('shows BURUH cards (Harvests, Payroll) only', () => {
    mockAuth = { user: { role: 'BURUH' }, isAdmin: false };
    render(<DashboardPage />);

    expect(screen.getByRole('link', { name: /harvests/i })).toHaveAttribute('href', '/dashboard/harvests');
    expect(screen.getByRole('link', { name: /payroll/i })).toHaveAttribute('href', '/dashboard/payroll');
    expect(screen.queryByRole('link', { name: /identity/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /plantations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /shipments/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /user admin/i })).not.toBeInTheDocument();
  });

  it('renders no module cards when the user is missing', () => {
    mockAuth = { user: null, isAdmin: false };
    render(<DashboardPage />);

    expect(screen.queryByRole('link', { name: /identity/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /plantations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /harvests/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /shipments/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /payroll/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /user admin/i })).not.toBeInTheDocument();
  });

  it('still renders the system status panel for any signed-in user', () => {
    mockAuth = { user: { role: 'BURUH' }, isAdmin: false };
    render(<DashboardPage />);

    expect(screen.getByText(/system status/i)).toBeInTheDocument();
    expect(screen.getByText(/identity service/i)).toBeInTheDocument();
    expect(screen.getByText(/payroll service/i)).toBeInTheDocument();
  });
});
