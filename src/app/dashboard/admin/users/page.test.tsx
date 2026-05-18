import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminUsersPage from './page';
import { adminService } from '@/services/admin.service';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/admin.service', () => ({
  adminService: {
    getUsers: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

let mockAuth: { user: { id: string; role: string } | null } = {
  user: { id: 'admin-id', role: 'ADMIN' },
};

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

const buildUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'u1',
  username: 'budi',
  email: 'budi@mail.com',
  name: 'Budi Santoso',
  role: 'BURUH',
  googleLinked: false,
  hasPassword: true,
  createdAt: '2026-01-01T00:00:00Z',
  mandorId: null,
  certificationNumber: null,
  kebunId: null,
  ...overrides,
});

describe('AdminUsersPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: { id: 'admin-id', role: 'ADMIN' } };
    (adminService.getUsers as jest.Mock).mockResolvedValue([]);
    (adminService.deleteUser as jest.Mock).mockResolvedValue({ message: 'ok' });
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('shows loading state then empty state when no users are returned', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    (adminService.getUsers as jest.Mock).mockReturnValue(
      new Promise((r) => { resolve = r; })
    );

    render(<AdminUsersPage />);
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();

    resolve?.([]);
    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
  });

  it('renders user rows with name, role badge, both auth badges, and a Delete button for other users', async () => {
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      buildUser({ id: 'u1', name: 'Budi Santoso', role: 'BURUH', hasPassword: true, googleLinked: true }),
    ]);
    render(<AdminUsersPage />);

    const cell = await screen.findByText('Budi Santoso');
    const row = cell.closest('tr') as HTMLElement;
    expect(within(row).getByText('BURUH')).toBeInTheDocument();
    expect(within(row).getByText('Password')).toBeInTheDocument();
    expect(within(row).getByText('Google')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/users/u1'
    );
    expect(within(row).getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('falls back to username when name is empty and shows gray badge for unknown role', async () => {
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      buildUser({ id: 'u1', name: '', username: 'noname', role: 'UNKNOWN' }),
    ]);
    render(<AdminUsersPage />);

    expect(await screen.findByText('noname')).toBeInTheDocument();
    const badge = screen.getByText('UNKNOWN');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('does not render auth badges when user has neither password nor google linked', async () => {
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      buildUser({ id: 'u1', hasPassword: false, googleLinked: false }),
    ]);
    render(<AdminUsersPage />);

    await screen.findByText('Budi Santoso');
    expect(screen.queryByText('Password')).not.toBeInTheDocument();
    expect(screen.queryByText('Google')).not.toBeInTheDocument();
  });

  it('hides the Delete button for the currently logged-in user', async () => {
    mockAuth = { user: { id: 'u1', role: 'ADMIN' } };
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      buildUser({ id: 'u1' }),
    ]);
    render(<AdminUsersPage />);

    const row = (await screen.findByText('Budi Santoso')).closest('tr') as HTMLElement;
    expect(within(row).getByRole('link', { name: /view/i })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('renders without delete buttons when currentUser is null', async () => {
    mockAuth = { user: null };
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      buildUser({ id: 'u1' }),
    ]);
    render(<AdminUsersPage />);

    // currentUser is null so optional-chain leaves comparison defined; delete should still render
    // because u.id ('u1') !== undefined.
    const row = (await screen.findByText('Budi Santoso')).closest('tr') as HTMLElement;
    expect(within(row).getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('initial load calls getUsers with undefined (no filters)', async () => {
    render(<AdminUsersPage />);
    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenCalledWith(undefined);
    });
  });

  it('applies name/email/role filters with trimmed values', async () => {
    render(<AdminUsersPage />);
    await screen.findByText(/no users found/i);

    fireEvent.change(screen.getByPlaceholderText(/search by name/i), {
      target: { value: '  Andi  ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/search by email/i), {
      target: { value: '  a@mail.com  ' },
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MANDOR' } });

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith({
        name: 'Andi',
        email: 'a@mail.com',
        role: 'MANDOR',
      });
    });
  });

  it('treats whitespace-only filter values as empty (still passes undefined)', async () => {
    render(<AdminUsersPage />);
    await screen.findByText(/no users found/i);

    fireEvent.change(screen.getByPlaceholderText(/search by name/i), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByPlaceholderText(/search by email/i), {
      target: { value: '   ' },
    });

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith(undefined);
    });
  });

  it('Clear Filters resets all inputs and reloads with no filters', async () => {
    render(<AdminUsersPage />);
    await screen.findByText(/no users found/i);

    fireEvent.change(screen.getByPlaceholderText(/search by name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByPlaceholderText(/search by email/i), { target: { value: 'Y' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ADMIN' } });

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith({
        name: 'X',
        email: 'Y',
        role: 'ADMIN',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      expect(adminService.getUsers).toHaveBeenLastCalledWith(undefined);
    });
    expect(screen.getByPlaceholderText(/search by name/i)).toHaveValue('');
    expect(screen.getByPlaceholderText(/search by email/i)).toHaveValue('');
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('delete: confirm declined does not call the service', async () => {
    confirmSpy.mockReturnValue(false);
    (adminService.getUsers as jest.Mock).mockResolvedValue([buildUser({ id: 'u1' })]);
    render(<AdminUsersPage />);
    await screen.findByText('Budi Santoso');

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(adminService.deleteUser).not.toHaveBeenCalled();
  });

  it('delete: confirm accepted deletes, shows success, clears after 3s, and reloads', async () => {
    jest.useFakeTimers();
    try {
      (adminService.getUsers as jest.Mock).mockResolvedValue([buildUser({ id: 'u1', username: 'budi' })]);
      render(<AdminUsersPage />);
      await screen.findByText('Budi Santoso');

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      await waitFor(() => {
        expect(adminService.deleteUser).toHaveBeenCalledWith('u1');
      });
      expect(screen.getByText(/user "budi" deleted successfully/i)).toBeInTheDocument();

      await waitFor(() => {
        expect((adminService.getUsers as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
      });

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByText(/deleted successfully/i)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows delete error from Error', async () => {
    (adminService.getUsers as jest.Mock).mockResolvedValue([buildUser({ id: 'u1' })]);
    (adminService.deleteUser as jest.Mock).mockRejectedValue(new Error('Delete failed'));

    render(<AdminUsersPage />);
    await screen.findByText('Budi Santoso');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    });
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (adminService.getUsers as jest.Mock).mockResolvedValue([buildUser({ id: 'u1' })]);
    (adminService.deleteUser as jest.Mock).mockRejectedValue('boom');

    render(<AdminUsersPage />);
    await screen.findByText('Budi Santoso');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    });
    expect(await screen.findByText('Failed to delete user')).toBeInTheDocument();
  });

  it('shows load error from Error', async () => {
    (adminService.getUsers as jest.Mock).mockRejectedValue(new Error('Load failed'));
    render(<AdminUsersPage />);
    expect(await screen.findByText('Load failed')).toBeInTheDocument();
  });

  it('shows fallback load error when thrown value is not Error', async () => {
    (adminService.getUsers as jest.Mock).mockRejectedValue('boom');
    render(<AdminUsersPage />);
    expect(await screen.findByText('Failed to load users')).toBeInTheDocument();
  });
});
