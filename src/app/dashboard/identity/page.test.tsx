import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import IdentityPage from './page';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';

const pushMock = jest.fn();
const routerMock = { push: pushMock };

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
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
    checkHealth: jest.fn(),
  },
}));

jest.mock('@/services/identity.service', () => ({
  identityService: {
    createDummyUser: jest.fn(),
  },
}));

describe('IdentityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: '10', username: 'alice', role: 'ADMIN' });
    (authService.checkHealth as jest.Mock).mockResolvedValue({ status: 'UP', service: 'mysawit-identity-service' });
    (identityService.createDummyUser as jest.Mock).mockResolvedValue({
      token: 'jwt', type: 'Bearer', id: '99', username: 'dummy', email: 'dummy@x.com', role: 'USER',
    });
  });

  it('redirects to login and renders nothing when not authenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
    const { container } = render(<IdentityPage />);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(container.firstChild).toBeNull();
  });

  it('renders UP status when health check succeeds', async () => {
    render(<IdentityPage />);
    expect(await screen.findByText('UP')).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/ADMIN/)).toBeInTheDocument();
  });

  it('renders DOWN status when health response is not UP', async () => {
    (authService.checkHealth as jest.Mock).mockResolvedValue({ status: 'DEGRADED', service: 'x' });
    render(<IdentityPage />);
    expect(await screen.findByText('DOWN')).toBeInTheDocument();
  });

  it('shows error and DOWN status when health check fails with Error', async () => {
    (authService.checkHealth as jest.Mock).mockRejectedValue(new Error('Service unreachable'));
    render(<IdentityPage />);
    expect(await screen.findByText('Service unreachable')).toBeInTheDocument();
    expect(screen.getByText('DOWN')).toBeInTheDocument();
  });

  it('shows fallback error when health check throws non-Error', async () => {
    (authService.checkHealth as jest.Mock).mockRejectedValue('boom');
    render(<IdentityPage />);
    expect(await screen.findByText('Failed to contact identity service')).toBeInTheDocument();
  });

  it('renders fallback labels when current user info is missing', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: null, username: null, role: null });
    render(<IdentityPage />);
    await screen.findByText('UP');
    expect(screen.getByText(/Unknown User/)).toBeInTheDocument();
    expect(screen.getByText(/UNKNOWN/)).toBeInTheDocument();
    expect(screen.getByText(/ID: -/)).toBeInTheDocument();
  });

  it('refresh health button re-invokes checkHealth', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /refresh health/i }));
    await waitFor(() => expect((authService.checkHealth as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('generate identity button replaces form values', async () => {
    const { container } = render(<IdentityPage />);
    await screen.findByText('UP');
    const usernameInput = container.querySelectorAll('input')[0] as HTMLInputElement;
    const original = usernameInput.value;

    jest.spyOn(Date, 'now').mockReturnValue(123456789);
    fireEvent.click(screen.getByRole('button', { name: /generate random identity/i }));
    const updated = (container.querySelectorAll('input')[0] as HTMLInputElement).value;

    expect(updated).not.toBe(original);
    expect(updated).toContain('123456789');
  });

  it('creates dummy user successfully and shows the result panel', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');

    fireEvent.click(screen.getByRole('button', { name: /create dummy user/i }));

    await waitFor(() => expect(identityService.createDummyUser).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Dummy user berhasil dibuat/i)).toBeInTheDocument();
    expect(screen.getByText('ID: 99')).toBeInTheDocument();
    expect(screen.getByText('Username: dummy')).toBeInTheDocument();
    expect(screen.getByText('Email: dummy@x.com')).toBeInTheDocument();
  });

  it('shows error from Error and hides previously created user when creation fails', async () => {
    (identityService.createDummyUser as jest.Mock)
      .mockResolvedValueOnce({ token: 'a', type: 'Bearer', id: '1', username: 'u', email: 'e', role: 'USER' })
      .mockRejectedValueOnce(new Error('Username taken'));

    render(<IdentityPage />);
    await screen.findByText('UP');

    fireEvent.click(screen.getByRole('button', { name: /create dummy user/i }));
    await screen.findByText(/Dummy user berhasil dibuat/i);

    fireEvent.click(screen.getByRole('button', { name: /create dummy user/i }));
    expect(await screen.findByText('Username taken')).toBeInTheDocument();
    expect(screen.queryByText(/Dummy user berhasil dibuat/i)).not.toBeInTheDocument();
  });

  it('shows fallback error when creation throws non-Error', async () => {
    (identityService.createDummyUser as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /create dummy user/i }));
    expect(await screen.findByText('Failed to create dummy user')).toBeInTheDocument();
  });

  it('shows saving label and disables button while creating', async () => {
    let resolvePromise: ((value: unknown) => void) | undefined;
    (identityService.createDummyUser as jest.Mock).mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /create dummy user/i }));

    const saving = await screen.findByRole('button', { name: /creating user\.\.\./i });
    expect(saving).toBeDisabled();

    resolvePromise?.({ token: 'a', type: 'Bearer', id: '1', username: 'u', email: 'e', role: 'USER' });
    await screen.findByText(/Dummy user berhasil dibuat/i);
  });

  it('updates form values when user edits inputs', async () => {
    const { container } = render(<IdentityPage />);
    await screen.findByText('UP');
    const [usernameInput, emailInput, passwordInput] = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];

    fireEvent.change(usernameInput, { target: { value: 'alice' } });
    fireEvent.change(emailInput, { target: { value: 'alice@x.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password1' } });

    expect(usernameInput.value).toBe('alice');
    expect(emailInput.value).toBe('alice@x.com');
    expect(passwordInput.value).toBe('password1');
  });
});
