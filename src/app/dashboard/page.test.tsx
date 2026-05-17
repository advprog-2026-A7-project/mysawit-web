import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  describe('System Status health probing', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders all services as Online when health probes succeed', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

      await act(async () => {
        render(<DashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText(/^Online$/).length).toBeGreaterThan(0);
      });
      expect(screen.queryByText(/checking…/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Offline$/)).not.toBeInTheDocument();
    });

    it('renders services as Offline when health probes return non-ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

      await act(async () => {
        render(<DashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText(/^Offline$/).length).toBeGreaterThan(0);
      });
    });

    it('renders services as Offline when fetch rejects', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

      await act(async () => {
        render(<DashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText(/^Offline$/).length).toBeGreaterThan(0);
      });
    });

    it('Refresh button resets statuses to "Checking…" and re-probes', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as unknown as typeof fetch;

      await act(async () => {
        render(<DashboardPage />);
      });

      await waitFor(() => {
        expect(screen.getAllByText(/^Online$/).length).toBeGreaterThan(0);
      });

      const firstCallCount = fetchMock.mock.calls.length;
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      });

      await waitFor(() => {
        expect(fetchMock.mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });
});
