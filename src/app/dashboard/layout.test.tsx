import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardLayout from './layout';
import { authService } from '@/services/auth.service';
import { RequireRole } from '@/components/RequireRole';

const pushMock = jest.fn();
let pathname = '/dashboard';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => pathname,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, onClick, ...props }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick} {...props}>
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

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pathname = '/dashboard';
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: 'u-1', username: 'budi', role: 'ADMIN' });
  });

  it('redirects to login and renders nothing when unauthenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    const { container } = render(<DashboardLayout><div>Protected child</div></DashboardLayout>);

    expect(container).toBeEmptyDOMElement();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
  });

  it('renders navigation, user info, active overview, and children', async () => {
    render(<DashboardLayout><div>Protected child</div></DashboardLayout>);

    expect(screen.getByText('Protected child')).toBeInTheDocument();
    expect(await screen.findByText('budi')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Beranda/i })).toHaveClass('active');
    expect(screen.getByRole('link', { name: /Pengiriman/i })).toHaveAttribute('href', '/dashboard/shipments');
  });

  it('provides auth context to nested role guards', async () => {
    render(
      <DashboardLayout>
        <RequireRole allow={['ADMIN']}>
          <div>Admin-only child</div>
        </RequireRole>
      </DashboardLayout>,
    );

    expect(await screen.findByText('Admin-only child')).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it('marks nested dashboard links active', async () => {
    pathname = '/dashboard/shipments/123';

    render(<DashboardLayout><div>Protected child</div></DashboardLayout>);

    expect(await screen.findByText('budi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pengiriman/i })).toHaveClass('active');
    expect(screen.getByRole('link', { name: /Beranda/i })).not.toHaveClass('active');
  });

  it('uses fallback user display values when user info is absent', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue(null);

    render(<DashboardLayout><div>Protected child</div></DashboardLayout>);

    expect(await screen.findByText('Pengguna')).toBeInTheDocument();
    expect(screen.queryByText('UNKNOWN')).not.toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('logs out and redirects to login', async () => {
    render(<DashboardLayout><div>Protected child</div></DashboardLayout>);
    await screen.findByText('budi');

    fireEvent.click(screen.getByTitle('Logout'));

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('opens and closes the mobile navbar menu', async () => {
    render(<DashboardLayout><div>Protected child</div></DashboardLayout>);
    await screen.findByText('budi');

    expect(document.querySelector('.ms-nav-mobile')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /buka menu/i }));
    expect(document.querySelector('.ms-nav-mobile')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /MySawit/i }));
    expect(document.querySelector('.ms-nav-mobile')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /buka menu/i }));
    const mobileNav = document.querySelector('.ms-nav-mobile') as HTMLElement;
    expect(mobileNav).toBeInTheDocument();

    fireEvent.click(within(mobileNav).getByRole('link', { name: /Panen/i }));
    expect(document.querySelector('.ms-nav-mobile')).not.toBeInTheDocument();
  });
});
