import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import UserDetailPage from './page';
import { adminService } from '@/services/admin.service';

const pushMock = jest.fn();
let mockUserId = 'target-user-id';

jest.mock('next/navigation', () => ({
  useParams: () => ({ userId: mockUserId }),
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/admin.service', () => ({
  adminService: {
    getUserById: jest.fn(),
    getUsers: jest.fn(),
    assignMandor: jest.fn(),
    unassignMandor: jest.fn(),
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
  id: 'target-user-id',
  username: 'buruh1',
  email: 'buruh1@mail.com',
  name: 'Buruh One',
  role: 'BURUH',
  googleLinked: false,
  hasPassword: true,
  createdAt: '2026-01-01T00:00:00Z',
  mandorId: null,
  certificationNumber: null,
  kebunId: null,
  ...overrides,
});

describe('UserDetailPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 'target-user-id';
    mockAuth = { user: { id: 'admin-id', role: 'ADMIN' } };
    (adminService.getUsers as jest.Mock).mockResolvedValue([]);
    (adminService.assignMandor as jest.Mock).mockResolvedValue({ message: 'ok' });
    (adminService.unassignMandor as jest.Mock).mockResolvedValue({ message: 'ok' });
    (adminService.deleteUser as jest.Mock).mockResolvedValue({ message: 'ok' });
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('shows loading state then renders user info, role badge, name, and auth badges', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    (adminService.getUserById as jest.Mock).mockReturnValue(
      new Promise((r) => { resolve = r; })
    );

    render(<UserDetailPage />);
    expect(screen.getByText(/loading user details/i)).toBeInTheDocument();

    resolve?.(buildUser({
      role: 'ADMIN',
      hasPassword: true,
      googleLinked: true,
      name: 'Root Admin',
    }));

    expect(await screen.findByText('Root Admin')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('shows User Not Found when load throws an Error', async () => {
    (adminService.getUserById as jest.Mock).mockRejectedValue(new Error('boom'));
    render(<UserDetailPage />);
    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
    expect(screen.getByText(/back to users/i)).toBeInTheDocument();
  });

  it('shows User Not Found when load rejects with non-Error', async () => {
    (adminService.getUserById as jest.Mock).mockRejectedValue('bad');
    render(<UserDetailPage />);
    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
  });

  it('falls back to username when name is empty and shows gray badge for unknown role', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({
      name: '',
      role: 'UNKNOWN_ROLE',
    }));
    render(<UserDetailPage />);
    expect(await screen.findByRole('heading', { name: 'buruh1' })).toBeInTheDocument();
    const badge = screen.getByText('UNKNOWN_ROLE');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('renders certificationNumber and kebunId rows when present', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({
      role: 'SUPIR',
      certificationNumber: 'CERT-123',
      kebunId: 'KEBUN-42',
    }));
    render(<UserDetailPage />);
    expect(await screen.findByText('CERT-123')).toBeInTheDocument();
    expect(screen.getByText('KEBUN-42')).toBeInTheDocument();
  });

  it('BURUH without mandor: assigns selected mandor, shows success, clears it after 3s, and reloads', async () => {
    jest.useFakeTimers();
    try {
      (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: null }));
      (adminService.getUsers as jest.Mock).mockResolvedValue([
        { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
      ]);

      render(<UserDetailPage />);
      await screen.findByText('Buruh One');

      const select = screen.getByRole('combobox');
      // Assign button disabled before a mandor is picked.
      const assignBtn = screen.getByRole('button', { name: /^assign$/i });
      expect(assignBtn).toBeDisabled();

      fireEvent.change(select, { target: { value: 'mandor-1' } });
      expect(assignBtn).toBeEnabled();

      // Trigger assign and verify success banner appears.
      await act(async () => {
        fireEvent.click(assignBtn);
      });

      await waitFor(() => {
        expect(adminService.assignMandor).toHaveBeenCalledWith('target-user-id', 'mandor-1');
      });
      expect(screen.getByText(/mandor assigned successfully/i)).toBeInTheDocument();

      // Reload was triggered (getUserById called again).
      await waitFor(() => {
        expect((adminService.getUserById as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
      });

      // Success message clears after 3 seconds.
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByText(/mandor assigned successfully/i)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('BURUH with mandorId resolved in mandor list: shows mandor name and unassigns on confirm', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: 'mandor-1' }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);

    render(<UserDetailPage />);
    expect(await screen.findByText('Mandor One')).toBeInTheDocument();

    const unassignBtn = screen.getByRole('button', { name: /unassign mandor/i });
    await act(async () => {
      fireEvent.click(unassignBtn);
    });

    await waitFor(() => {
      expect(adminService.unassignMandor).toHaveBeenCalledWith('target-user-id');
    });
    expect(screen.getByText(/mandor unassigned successfully/i)).toBeInTheDocument();
  });

  it('BURUH with mandorId not in mandor list falls back to the raw id', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: 'missing-mandor' }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([]);

    render(<UserDetailPage />);
    expect(await screen.findByText('missing-mandor')).toBeInTheDocument();
  });

  it('BURUH with mandor list entry missing name falls back to username in the option label', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: null }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: '', role: 'MANDOR' },
    ]);

    render(<UserDetailPage />);
    const select = await screen.findByRole('combobox');
    expect(within(select).getByText(/mandor1 \(m1@mail\.com\)/)).toBeInTheDocument();
  });

  it('assignMandor early-returns when no mandor is selected', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: null }));
    render(<UserDetailPage />);
    await screen.findByText('Buruh One');

    // Find the disabled Assign button — clicking shouldn't call the service.
    const assignBtn = screen.getByRole('button', { name: /^assign$/i });
    fireEvent.click(assignBtn);
    expect(adminService.assignMandor).not.toHaveBeenCalled();
  });

  it('shows assign-mandor error from Error', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: null }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    (adminService.assignMandor as jest.Mock).mockRejectedValue(new Error('Assign failed'));

    render(<UserDetailPage />);
    await screen.findByText('Buruh One');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mandor-1' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));
    });
    expect(await screen.findByText('Assign failed')).toBeInTheDocument();
  });

  it('shows fallback assign-mandor error when thrown value is not Error', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: null }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    (adminService.assignMandor as jest.Mock).mockRejectedValue('boom');

    render(<UserDetailPage />);
    await screen.findByText('Buruh One');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mandor-1' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));
    });
    expect(await screen.findByText('Failed to assign mandor')).toBeInTheDocument();
  });

  it('unassignMandor does nothing when confirm is declined', async () => {
    confirmSpy.mockReturnValue(false);
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: 'mandor-1' }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);

    render(<UserDetailPage />);
    await screen.findByText('Mandor One');

    fireEvent.click(screen.getByRole('button', { name: /unassign mandor/i }));
    expect(adminService.unassignMandor).not.toHaveBeenCalled();
  });

  it('shows unassign error from Error', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: 'mandor-1' }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    (adminService.unassignMandor as jest.Mock).mockRejectedValue(new Error('Unassign failed'));

    render(<UserDetailPage />);
    await screen.findByText('Mandor One');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /unassign mandor/i }));
    });
    expect(await screen.findByText('Unassign failed')).toBeInTheDocument();
  });

  it('shows fallback unassign error when thrown value is not Error', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: 'mandor-1' }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    (adminService.unassignMandor as jest.Mock).mockRejectedValue('boom');

    render(<UserDetailPage />);
    await screen.findByText('Mandor One');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /unassign mandor/i }));
    });
    expect(await screen.findByText('Failed to unassign mandor')).toBeInTheDocument();
  });

  it('non-BURUH role does not render the Mandor Assignment section', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ role: 'MANDOR' }));
    render(<UserDetailPage />);
    await screen.findByText('Buruh One');
    expect(screen.queryByText(/mandor assignment/i)).not.toBeInTheDocument();
  });

  it('hides Danger Zone when viewing the currently logged-in user', async () => {
    mockAuth = { user: { id: 'target-user-id', role: 'ADMIN' } };
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser());
    render(<UserDetailPage />);
    await screen.findByText('Buruh One');
    expect(screen.queryByText(/danger zone/i)).not.toBeInTheDocument();
  });

  it('shows Danger Zone when currentUser is null and renders delete', async () => {
    mockAuth = { user: null };
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser());
    render(<UserDetailPage />);
    await screen.findByText('Buruh One');
    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
  });

  it('delete: confirm declined does not call the service', async () => {
    confirmSpy.mockReturnValue(false);
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser());
    render(<UserDetailPage />);
    await screen.findByText('Buruh One');

    fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
    expect(adminService.deleteUser).not.toHaveBeenCalled();
  });

  it('delete: confirm accepted deletes the user and navigates to the list', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser());
    render(<UserDetailPage />);
    await screen.findByText('Buruh One');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
    });

    await waitFor(() => {
      expect(adminService.deleteUser).toHaveBeenCalledWith('target-user-id');
    });
    expect(pushMock).toHaveBeenCalledWith('/dashboard/admin/users');
  });

  it('shows delete error from Error', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser());
    (adminService.deleteUser as jest.Mock).mockRejectedValue(new Error('Delete failed'));

    render(<UserDetailPage />);
    await screen.findByText('Buruh One');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
    });
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser());
    (adminService.deleteUser as jest.Mock).mockRejectedValue('boom');

    render(<UserDetailPage />);
    await screen.findByText('Buruh One');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete user/i }));
    });
    expect(await screen.findByText('Failed to delete user')).toBeInTheDocument();
  });

  it('shows transient "Assigning..." label while the assign request is in flight', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: null }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    let resolveAssign: ((value: unknown) => void) | undefined;
    (adminService.assignMandor as jest.Mock).mockReturnValue(
      new Promise((r) => { resolveAssign = r; })
    );

    render(<UserDetailPage />);
    await screen.findByText('Buruh One');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'mandor-1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^assign$/i }));
    });

    expect(screen.getByRole('button', { name: /assigning/i })).toBeDisabled();

    await act(async () => {
      resolveAssign?.({ message: 'ok' });
    });
  });

  it('shows transient "Processing..." label while the unassign request is in flight', async () => {
    (adminService.getUserById as jest.Mock).mockResolvedValue(buildUser({ mandorId: 'mandor-1' }));
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      { id: 'mandor-1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    let resolveUnassign: ((value: unknown) => void) | undefined;
    (adminService.unassignMandor as jest.Mock).mockReturnValue(
      new Promise((r) => { resolveUnassign = r; })
    );

    render(<UserDetailPage />);
    await screen.findByText('Mandor One');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /unassign mandor/i }));
    });

    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();

    await act(async () => {
      resolveUnassign?.({ message: 'ok' });
    });
  });
});
