import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    googleLogin: jest.fn(),
  },
}));

jest.mock('@react-oauth/google', () => ({
  __esModule: true,
  GoogleLogin: (props: {
    onSuccess: (r: { credential?: string }) => void;
    onError?: () => void;
  }) => (
    <div data-testid="google-login">
      <button
        type="button"
        data-testid="google-ok"
        onClick={() => props.onSuccess({ credential: 'fake-google-token' })}
      >
        google-ok
      </button>
      <button
        type="button"
        data-testid="google-no-cred"
        onClick={() => props.onSuccess({})}
      >
        google-no-cred
      </button>
      <button
        type="button"
        data-testid="google-err"
        onClick={() => props.onError?.()}
      >
        google-err
      </button>
    </div>
  ),
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

  it('Google login: redirects on success', async () => {
    (authService.googleLogin as jest.Mock).mockResolvedValue(undefined);
    render(<LoginPage />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });

    await waitFor(() => {
      expect(authService.googleLogin).toHaveBeenCalledWith({ idToken: 'fake-google-token' });
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('Google login: shows error when credential is missing', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByTestId('google-no-cred'));
    expect(screen.getByText(/google login failed: no credential received/i)).toBeInTheDocument();
    expect(authService.googleLogin).not.toHaveBeenCalled();
  });

  it('Google login: GoogleLogin onError sets the canned error message', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByTestId('google-err'));
    expect(screen.getByText(/^google login failed$/i)).toBeInTheDocument();
  });

  it('Google login: rewrites "already registered" errors with linking guidance', async () => {
    (authService.googleLogin as jest.Mock).mockRejectedValue(
      new Error('Email already registered with a password'),
    );
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });
    expect(
      await screen.findByText(/already registered with a password.*link your google account/i),
    ).toBeInTheDocument();
  });

  it('Google login: rewrites "conflict" errors with linking guidance', async () => {
    (authService.googleLogin as jest.Mock).mockRejectedValue(new Error('CONFLICT: duplicate'));
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });
    expect(
      await screen.findByText(/already registered with a password.*link your google account/i),
    ).toBeInTheDocument();
  });

  it('Google login: shows raw Error message for non-conflict failures', async () => {
    (authService.googleLogin as jest.Mock).mockRejectedValue(new Error('Token rejected'));
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });
    expect(await screen.findByText('Token rejected')).toBeInTheDocument();
  });

  it('Google login: shows fallback error when thrown value is not Error', async () => {
    (authService.googleLogin as jest.Mock).mockRejectedValue('boom');
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });
    expect(await screen.findByText(/^google login failed$/i)).toBeInTheDocument();
  });
});
