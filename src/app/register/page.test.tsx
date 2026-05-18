import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  },
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
    fireEvent.change(screen.getByPlaceholderText(/opsional/i), { target: { value: 'CERT-99' } });
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
});
