import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegisterPage from './page';
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
    register: jest.fn(),
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

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fillRequiredFields = (password: string, confirmPassword: string) => {
    fireEvent.change(screen.getByPlaceholderText(/budi\.mandor/i), {
      target: { value: 'user' },
    });
    fireEvent.change(screen.getByPlaceholderText(/nama@email\.com/i), {
      target: { value: 'user@mail.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/minimal 6 karakter/i), {
      target: { value: password },
    });
    fireEvent.change(screen.getByPlaceholderText(/ulangi password/i), {
      target: { value: confirmPassword },
    });
  };

  it('shows mismatch validation error', async () => {
    render(<RegisterPage />);

    fillRequiredFields('secret123', 'secret124');
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    expect(await screen.findByText('Konfirmasi password belum sama')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('shows password length validation error', async () => {
    render(<RegisterPage />);

    fillRequiredFields('short', 'short');
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    expect(await screen.findByText('Password minimal 6 karakter')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('registers and redirects on success', async () => {
    (authService.register as jest.Mock).mockResolvedValue(undefined);

    render(<RegisterPage />);

    fillRequiredFields('secret123', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        username: 'user',
        email: 'user@mail.com',
        password: 'secret123',
        role: 'BURUH',
        certificationNumber: undefined,
        mandorId: undefined,
        kebunId: undefined,
      });
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
    (authService.register as jest.Mock).mockReturnValue(pendingPromise);

    render(<RegisterPage />);

    fillRequiredFields('secret123', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    expect(screen.getByRole('button', { name: /membuat akun\.\.\./i })).toBeDisabled();

    resolvePromise?.();
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error from Error instance on register failure', async () => {
    (authService.register as jest.Mock).mockRejectedValue(new Error('Registration failed from API'));

    render(<RegisterPage />);

    fillRequiredFields('secret123', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    expect(await screen.findByText('Registration failed from API')).toBeInTheDocument();
  });

  it('registers MANDOR with certification number', async () => {
    (authService.register as jest.Mock).mockResolvedValue(undefined);
    render(<RegisterPage />);
    fillRequiredFields('secret123', 'secret123');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MANDOR' } });
    fireEvent.change(screen.getByPlaceholderText(/cert-001/i), { target: { value: 'CERT-99' } });
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith(expect.objectContaining({
        role: 'MANDOR',
        certificationNumber: 'CERT-99',
        mandorId: undefined,
        kebunId: undefined,
      }));
    });
  });

  it('does not ask BURUH users to type mandor or kebun ids manually', async () => {
    (authService.register as jest.Mock).mockResolvedValue(undefined);
    render(<RegisterPage />);
    fillRequiredFields('secret123', 'secret123');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'BURUH' } });
    expect(screen.queryByPlaceholderText(/optional mandor id/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/optional kebun id/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith(expect.objectContaining({
        role: 'BURUH',
        mandorId: undefined,
        kebunId: undefined,
      }));
    });
  });

  it('shows fallback error when thrown value is not Error', async () => {
    (authService.register as jest.Mock).mockRejectedValue('bad');

    render(<RegisterPage />);

    fillRequiredFields('secret123', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));

    expect(await screen.findByText('Gagal membuat akun')).toBeInTheDocument();
  });

  describe('Google sign-up mode', () => {
    const switchToGoogle = () => {
      fireEvent.click(screen.getByRole('button', { name: /sign up with google/i }));
    };

    it('toggling to Google mode hides the email form and shows the Google widget', () => {
      render(<RegisterPage />);
      // Pre-fill the email form so we can confirm resetForm clears it on toggle.
      fillRequiredFields('secret123', 'secret123');
      switchToGoogle();
      expect(screen.queryByPlaceholderText(/enter your email/i)).not.toBeInTheDocument();
      expect(screen.getByTestId('google-login')).toBeInTheDocument();
      // Username is re-rendered in Google mode; resetForm should have blanked it.
      expect(screen.getByPlaceholderText(/choose a username/i)).toHaveValue('');
    });

    it('toggling back to Email mode resets the Google form fields', () => {
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'budi' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up with email/i }));
      expect(screen.getByPlaceholderText(/choose a username/i)).toHaveValue('');
      expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();
    });

    it('registers via Google success and redirects', async () => {
      (authService.googleLogin as jest.Mock).mockResolvedValue(undefined);
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'budi' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('google-ok'));
      });
      await waitFor(() => {
        expect(authService.googleLogin).toHaveBeenCalledWith({
          idToken: 'fake-google-token',
          username: 'budi',
          role: 'BURUH',
        });
      });
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('passes certificationNumber when role is MANDOR', async () => {
      (authService.googleLogin as jest.Mock).mockResolvedValue(undefined);
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'mandor1' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MANDOR' } });
      fireEvent.change(screen.getByPlaceholderText(/enter certification number/i), { target: { value: 'CERT-7' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('google-ok'));
      });
      await waitFor(() => {
        expect(authService.googleLogin).toHaveBeenCalledWith({
          idToken: 'fake-google-token',
          username: 'mandor1',
          role: 'MANDOR',
          certificationNumber: 'CERT-7',
        });
      });
    });

    it('shows error when Google returns no credential', () => {
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'budi' } });
      fireEvent.click(screen.getByTestId('google-no-cred'));
      expect(screen.getByText(/google sign-up failed: no credential received/i)).toBeInTheDocument();
      expect(authService.googleLogin).not.toHaveBeenCalled();
    });

    it('shows error from Error when Google sign-up fails', async () => {
      (authService.googleLogin as jest.Mock).mockRejectedValue(new Error('Google upstream down'));
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'budi' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('google-ok'));
      });
      expect(await screen.findByText('Google upstream down')).toBeInTheDocument();
    });

    it('shows fallback error when thrown value is not Error', async () => {
      (authService.googleLogin as jest.Mock).mockRejectedValue('boom');
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'budi' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('google-ok'));
      });
      expect(await screen.findByText(/google registration failed/i)).toBeInTheDocument();
    });

    it('shows the GoogleLogin onError canned message', () => {
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'budi' } });
      fireEvent.click(screen.getByTestId('google-err'));
      expect(screen.getByText(/google authentication failed/i)).toBeInTheDocument();
    });

    it('shows "Creating account..." while Google sign-up is pending and hides the Google widget', async () => {
      let resolve: ((value: unknown) => void) | undefined;
      (authService.googleLogin as jest.Mock).mockReturnValue(new Promise((r) => { resolve = r; }));
      render(<RegisterPage />);
      switchToGoogle();
      fireEvent.change(screen.getByPlaceholderText(/choose a username/i), { target: { value: 'budi' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('google-ok'));
      });
      expect(screen.getByText(/creating account\.\.\./i)).toBeInTheDocument();
      expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();
      await act(async () => {
        resolve?.(undefined);
      });
    });
  });
});
