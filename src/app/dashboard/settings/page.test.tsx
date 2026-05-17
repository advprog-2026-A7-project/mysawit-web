import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPage from './page';
import { authService } from '@/services/auth.service';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    setPassword: jest.fn(),
    linkGoogle: jest.fn(),
  },
}));

// Rich GoogleLogin mock exposing onSuccess (with and without credential) and onError
// so the test can drive every branch of handleGoogleLink.
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

type MockUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  googleLinked: boolean;
  hasPassword: boolean;
};

let mockAuth: { user: MockUser | null } = {
  user: {
    id: 'u1',
    username: 'budi',
    email: 'budi@mail.com',
    role: 'BURUH',
    googleLinked: false,
    hasPassword: false,
  },
};

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

const setUser = (overrides: Partial<MockUser> = {}) => {
  mockAuth = {
    user: {
      id: 'u1',
      username: 'budi',
      email: 'budi@mail.com',
      role: 'BURUH',
      googleLinked: false,
      hasPassword: false,
      ...overrides,
    },
  };
};

const submitPasswordForm = (password: string, confirmPassword: string) => {
  fireEvent.change(screen.getByPlaceholderText(/^enter password$/i), {
    target: { value: password },
  });
  fireEvent.change(screen.getByPlaceholderText(/confirm password/i), {
    target: { value: confirmPassword },
  });
  // Use fireEvent.submit on the form to bypass jsdom HTML5 validation (minLength/required).
  const form = screen.getByPlaceholderText(/^enter password$/i).closest('form') as HTMLFormElement;
  fireEvent.submit(form);
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUser();
    (authService.setPassword as jest.Mock).mockResolvedValue({ message: 'ok' });
    (authService.linkGoogle as jest.Mock).mockResolvedValue({ message: 'ok' });
  });

  it('renders account info, known role label, and initial unlinked/no-password states', () => {
    setUser({ role: 'BURUH', googleLinked: false, hasPassword: false });
    render(<SettingsPage />);

    expect(screen.getByText('budi')).toBeInTheDocument();
    expect(screen.getByText('budi@mail.com')).toBeInTheDocument();
    expect(screen.getByText('Buruh (Worker)')).toBeInTheDocument();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^set password$/i })).toBeInTheDocument();
  });

  it('falls back to raw role when role is not in the label map', () => {
    setUser({ role: 'UNKNOWN' });
    render(<SettingsPage />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('renders with default state when there is no current user', () => {
    mockAuth = { user: null };
    render(<SettingsPage />);
    // googleLinked and hasPassword default to false → unlinked widgets shown.
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^set password$/i })).toBeInTheDocument();
  });

  it('shows "Google account linked" state when initial googleLinked is true', () => {
    setUser({ googleLinked: true });
    render(<SettingsPage />);
    expect(screen.getByText(/google account linked/i)).toBeInTheDocument();
    expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();
  });

  it('shows "Password is set" state and Update Password button when hasPassword is true', () => {
    setUser({ hasPassword: true });
    render(<SettingsPage />);
    expect(screen.getByText(/password is set/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    expect(screen.getByText(/new password/i)).toBeInTheDocument();
  });

  it('Google link success: shows linked UI, success banner, then clears banner after 3s', async () => {
    jest.useFakeTimers();
    try {
      render(<SettingsPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('google-ok'));
      });

      await waitFor(() => {
        expect(authService.linkGoogle).toHaveBeenCalledWith('fake-google-token');
      });
      expect(screen.getByText(/google account linked successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/google account linked$/i)).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByText(/google account linked successfully/i)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('Google link: shows "Linking..." while in flight', async () => {
    let resolveLink: ((value: unknown) => void) | undefined;
    (authService.linkGoogle as jest.Mock).mockReturnValue(
      new Promise((r) => { resolveLink = r; })
    );

    render(<SettingsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });

    expect(screen.getByText(/^linking\.\.\.$/i)).toBeInTheDocument();
    expect(screen.queryByTestId('google-login')).not.toBeInTheDocument();

    await act(async () => {
      resolveLink?.({ message: 'ok' });
    });
  });

  it('Google link: shows error when credential is missing from response', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('google-no-cred'));
    expect(screen.getByText(/failed to get google credential/i)).toBeInTheDocument();
    expect(authService.linkGoogle).not.toHaveBeenCalled();
  });

  it('Google link: shows error from Error', async () => {
    (authService.linkGoogle as jest.Mock).mockRejectedValue(new Error('Link failed'));
    render(<SettingsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });
    expect(await screen.findByText('Link failed')).toBeInTheDocument();
  });

  it('Google link: shows fallback error when thrown value is not Error', async () => {
    (authService.linkGoogle as jest.Mock).mockRejectedValue('boom');
    render(<SettingsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('google-ok'));
    });
    expect(await screen.findByText(/failed to link google account/i)).toBeInTheDocument();
  });

  it('Google link: GoogleLogin onError handler sets the canned error message', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('google-err'));
    expect(screen.getByText(/google authentication failed/i)).toBeInTheDocument();
  });

  it('Set password: mismatched passwords show error and skip the service call', () => {
    render(<SettingsPage />);
    submitPasswordForm('secret1', 'secret2');
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(authService.setPassword).not.toHaveBeenCalled();
  });

  it('Set password: too-short password shows length error and skips the service call', () => {
    render(<SettingsPage />);
    submitPasswordForm('abc', 'abc');
    expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    expect(authService.setPassword).not.toHaveBeenCalled();
  });

  it('Set password success: calls service, switches to set state, clears form, auto-clears success banner', async () => {
    jest.useFakeTimers();
    try {
      render(<SettingsPage />);
      await act(async () => {
        submitPasswordForm('secret123', 'secret123');
      });

      await waitFor(() => {
        expect(authService.setPassword).toHaveBeenCalledWith('secret123');
      });
      expect(screen.getByText(/password set successfully/i)).toBeInTheDocument();
      // Form switches to "set" mode.
      expect(screen.getByText(/password is set/i)).toBeInTheDocument();
      // Inputs are cleared.
      expect(screen.getByPlaceholderText(/^enter password$/i)).toHaveValue('');
      expect(screen.getByPlaceholderText(/confirm password/i)).toHaveValue('');

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByText(/password set successfully/i)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('Set password (update mode): button reads "Saving..." while in flight when user already has a password', async () => {
    setUser({ hasPassword: true });
    let resolveSet: ((value: unknown) => void) | undefined;
    (authService.setPassword as jest.Mock).mockReturnValue(
      new Promise((r) => { resolveSet = r; })
    );

    render(<SettingsPage />);
    // The button now starts as "Update Password"; submitting flips the text
    // to "Saving..." — the third branch of the ternary on line 220.
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    await act(async () => {
      submitPasswordForm('secret123', 'secret123');
    });
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

    await act(async () => {
      resolveSet?.({ message: 'ok' });
    });
  });

  it('Set password: shows "Saving..." while in flight and the button is disabled', async () => {
    let resolveSet: ((value: unknown) => void) | undefined;
    (authService.setPassword as jest.Mock).mockReturnValue(
      new Promise((r) => { resolveSet = r; })
    );

    render(<SettingsPage />);
    await act(async () => {
      submitPasswordForm('secret123', 'secret123');
    });

    const savingBtn = screen.getByRole('button', { name: /saving/i });
    expect(savingBtn).toBeDisabled();

    await act(async () => {
      resolveSet?.({ message: 'ok' });
    });
  });

  it('Set password: shows error from Error', async () => {
    (authService.setPassword as jest.Mock).mockRejectedValue(new Error('Set failed'));
    render(<SettingsPage />);
    await act(async () => {
      submitPasswordForm('secret123', 'secret123');
    });
    expect(await screen.findByText('Set failed')).toBeInTheDocument();
  });

  it('Set password: shows fallback error when thrown value is not Error', async () => {
    (authService.setPassword as jest.Mock).mockRejectedValue('boom');
    render(<SettingsPage />);
    await act(async () => {
      submitPasswordForm('secret123', 'secret123');
    });
    expect(await screen.findByText(/failed to set password/i)).toBeInTheDocument();
  });
});
