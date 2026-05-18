import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from './page';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
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
    login: jest.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits credentials and redirects on success', async () => {
    (authService.login as jest.Mock).mockResolvedValue(undefined);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/nama@email\.com/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'secret' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret' });
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows loading text while request is pending', async () => {
    let resolvePromise: (() => void) | undefined;
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    (authService.login as jest.Mock).mockReturnValue(pendingPromise);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/nama@email\.com/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'secret' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

    expect(screen.getByRole('button', { name: /masuk\.\.\./i })).toBeDisabled();

    resolvePromise?.();
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error from Error instance on login failure', async () => {
    (authService.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/nama@email\.com/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('shows fallback error when thrown value is not Error', async () => {
    (authService.login as jest.Mock).mockRejectedValue('bad');

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText(/nama@email\.com/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'wrong' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

    expect(await screen.findByText('Gagal masuk')).toBeInTheDocument();
  });
});
