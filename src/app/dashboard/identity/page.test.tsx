import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import IdentityPage from './page';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';

const pushMock = jest.fn();
const routerMock = { push: pushMock };
const confirmMock = jest.fn();

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
    checkHealth: jest.fn(),
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/identity.service', () => ({
  identityService: {
    listUsers: jest.fn(),
    createDummyUser: jest.fn(),
    assignMandor: jest.fn(),
    unassignMandor: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

const userInfo = { id: 'me-1', username: 'admin', role: 'ADMIN' };

const sampleUsers = [
  {
    id: 'u-1',
    username: 'budi',
    name: 'Budi',
    email: 'budi@example.com',
    role: 'BURUH',
    mandorId: 'm-1',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u-2',
    username: 'sari',
    email: 'sari@example.com',
    role: 'MANDOR',
    createdAt: 'not-a-date',
  },
  {
    id: 'u-3',
    username: 'tono',
    email: 'tono@example.com',
    role: 'ADMIN',
    createdAt: '',
  },
];

const openCreateTab = async () => {
  await screen.findByText('Budi');
  fireEvent.click(screen.getByRole('button', { name: /^\+ tambah anggota$/i }));
};

const openAssignTab = async () => {
  await screen.findByText('Budi');
  fireEvent.click(screen.getByRole('button', { name: /^penugasan mandor$/i }));
};

const getCreateFields = () => {
  const panel = screen.getByText('Tambah Anggota Baru').closest('div.glass-card') as HTMLElement;
  const form = panel.querySelector('form') as HTMLFormElement;
  const textboxes = within(form).getAllByRole('textbox') as HTMLInputElement[];

  return {
    form,
    username: textboxes[0],
    email: textboxes[1],
    password: textboxes[2],
    role: within(form).getByRole('combobox') as HTMLSelectElement,
  };
};

const fillCreateUser = () => {
  const fields = getCreateFields();
  fireEvent.change(fields.username, { target: { value: 'newuser' } });
  fireEvent.change(fields.email, { target: { value: 'new@example.com' } });
  fireEvent.change(fields.password, { target: { value: 'secret1' } });
  return fields;
};

const getAssignForm = () => {
  const panel = screen.getByText('Tugaskan Pekerja ke Mandor').closest('div.glass-card') as HTMLElement;
  return panel.querySelector('form') as HTMLFormElement;
};

describe('IdentityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    confirmMock.mockReturnValue(true);

    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.checkHealth as jest.Mock).mockResolvedValue({ status: 'UP', service: 'identity' });
    (authService.getUserInfo as jest.Mock).mockReturnValue(userInfo);

    (identityService.listUsers as jest.Mock).mockResolvedValue(sampleUsers);
    (identityService.createDummyUser as jest.Mock).mockResolvedValue({
      id: 'new-1',
      username: 'newcomer',
      role: 'BURUH',
      email: 'newcomer@example.com',
      token: 't',
      type: 'Bearer',
    });
    (identityService.assignMandor as jest.Mock).mockResolvedValue({ message: 'ok' });
    (identityService.unassignMandor as jest.Mock).mockResolvedValue({ message: 'ok' });
    (identityService.deleteUser as jest.Mock).mockResolvedValue({ message: 'ok' });
  });

  it('renders page shell even when auth state is false', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
    render(<IdentityPage />);
    expect(await screen.findByRole('heading', { name: /Manajemen Tim/i })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders team table after successful load', async () => {
    render(<IdentityPage />);
    expect(await screen.findByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('sari')).toBeInTheDocument();
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
  });

  it('uses fallback badge styling for unknown roles', async () => {
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'u-x', username: 'auditor', email: 'audit@example.com', role: 'AUDITOR' },
    ]);

    render(<IdentityPage />);

    expect(await screen.findByText('AUDITOR')).toHaveClass('badge-gray');
  });

  it('does not render delete action for current user', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: null, username: null, role: null });
    render(<IdentityPage />);
    const row = (await screen.findByText('Budi')).closest('tr') as HTMLElement;
    expect(within(row).queryByRole('button', { name: /hapus/i })).toBeInTheDocument();
  });

  it('shows load error from Error', async () => {
    (identityService.listUsers as jest.Mock).mockRejectedValue(new Error('boom'));
    render(<IdentityPage />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('shows fallback error when loading throws non-Error', async () => {
    (identityService.listUsers as jest.Mock).mockRejectedValue('weird');
    render(<IdentityPage />);
    expect(await screen.findByText(/Gagal memuat tim operasional/i)).toBeInTheDocument();
  });

  it('does not call health check for the team page', async () => {
    render(<IdentityPage />);
    await screen.findByText('Budi');
    expect(authService.checkHealth).not.toHaveBeenCalled();
  });

  it('Refresh button re-invokes loadData', async () => {
    render(<IdentityPage />);
    await screen.findByText('Budi');
    fireEvent.click(screen.getByRole('button', { name: /perbarui/i }));
    await waitFor(() => {
      expect((identityService.listUsers as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('resets filters and dismisses alerts', async () => {
    render(<IdentityPage />);
    await screen.findByText('Budi');

    fireEvent.change(screen.getByPlaceholderText('Cari nama...'), { target: { value: 'Budi' } });
    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() => {
      expect((identityService.listUsers as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /hapus/i }));
    const successAlert = await screen.findByText('Anggota berhasil dihapus');
    fireEvent.click(within(successAlert.parentElement as HTMLElement).getByRole('button'));
    expect(screen.queryByText('Anggota berhasil dihapus')).not.toBeInTheDocument();

    (identityService.listUsers as jest.Mock).mockRejectedValueOnce(new Error('refresh failed'));
    fireEvent.click(screen.getByRole('button', { name: /perbarui/i }));
    const errorAlert = await screen.findByText('refresh failed');
    fireEvent.click(within(errorAlert.parentElement as HTMLElement).getByRole('button'));
    expect(screen.queryByText('refresh failed')).not.toBeInTheDocument();
  });

  it('Generate Identity button updates form values', async () => {
    render(<IdentityPage />);
    await openCreateTab();
    fireEvent.click(screen.getByRole('button', { name: /isi otomatis/i }));
    const fields = getCreateFields();
    expect(fields.username.value).toContain('user.');
    expect(fields.email.value).toContain('@mysawit.local');
  });

  it('creates a member and shows result panel', async () => {
    render(<IdentityPage />);
    await openCreateTab();

    fillCreateUser();

    fireEvent.click(screen.getByRole('button', { name: /^tambah anggota$/i }));

    await waitFor(() => {
      expect(identityService.createDummyUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'secret1',
        role: 'BURUH',
        certificationNumber: undefined,
        mandorId: undefined,
        kebunId: undefined,
      });
    });

    expect(await screen.findByText('Anggota berhasil dibuat.')).toBeInTheDocument();
    expect(screen.getByText(/Akun newcomer siap digunakan/i)).toBeInTheDocument();
  });

  it('creates mandor users with certification number', async () => {
    render(<IdentityPage />);
    await openCreateTab();

    const fields = fillCreateUser();
    fireEvent.change(fields.role, { target: { value: 'MANDOR' } });
    fireEvent.change(screen.getByPlaceholderText('Opsional'), { target: { value: 'CERT-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^tambah anggota$/i }));

    await waitFor(() => {
      expect(identityService.createDummyUser).toHaveBeenCalledWith(expect.objectContaining({
        role: 'MANDOR',
        certificationNumber: 'CERT-1',
        mandorId: undefined,
        kebunId: undefined,
      }));
    });
  });

  it('creates dummy user with undefined optional fields when blank', async () => {
    render(<IdentityPage />);
    await openCreateTab();

    const fields = getCreateFields();
    fireEvent.change(fields.username, { target: { value: 'u1' } });
    fireEvent.change(fields.email, { target: { value: 'u1@x.com' } });
    fireEvent.change(fields.password, { target: { value: 'pwd-abc' } });
    fireEvent.click(screen.getByRole('button', { name: /^tambah anggota$/i }));

    await waitFor(() => {
      expect(identityService.createDummyUser).toHaveBeenCalledWith({
        username: 'u1',
        email: 'u1@x.com',
        password: 'pwd-abc',
        role: 'BURUH',
        certificationNumber: undefined,
        mandorId: undefined,
        kebunId: undefined,
      });
    });
  });

  it('shows create error from Error and hides previously created user panel', async () => {
    (identityService.createDummyUser as jest.Mock)
      .mockResolvedValueOnce({ id: 'first', username: 'first', role: 'BURUH', email: 'a@b', token: 't', type: 'Bearer' })
      .mockRejectedValueOnce(new Error('Create failed'));

    render(<IdentityPage />);
    await openCreateTab();

    const fields = getCreateFields();
    fireEvent.change(fields.username, { target: { value: 'first' } });
    fireEvent.change(fields.email, { target: { value: 'f@x.com' } });
    fireEvent.change(fields.password, { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /^tambah anggota$/i }));
    expect(await screen.findByText('Anggota berhasil dibuat.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^tambah anggota$/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
    expect(screen.queryByText('Anggota berhasil dibuat.')).not.toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (identityService.createDummyUser as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    await openCreateTab();
    const fields = getCreateFields();
    fireEvent.change(fields.username, { target: { value: 'x' } });
    fireEvent.change(fields.email, { target: { value: 'x@y.com' } });
    fireEvent.change(fields.password, { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /^tambah anggota$/i }));
    expect(await screen.findByText('Gagal membuat user')).toBeInTheDocument();
  });

  it('shows saving label and disables button while creating', async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    (identityService.createDummyUser as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    render(<IdentityPage />);
    await openCreateTab();
    const fields = getCreateFields();
    fireEvent.change(fields.username, { target: { value: 'x' } });
    fireEvent.change(fields.email, { target: { value: 'x@y.com' } });
    fireEvent.change(fields.password, { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /^tambah anggota$/i }));
    expect(await screen.findByRole('button', { name: /membuat/i })).toBeDisabled();
    resolveCreate?.({ id: 'r-1', username: 'x', role: 'BURUH', email: 'x@y.com', token: 't', type: 'Bearer' });
    await screen.findByText('Anggota berhasil dibuat.');
  });

  it('filters users via the search form with values', async () => {
    render(<IdentityPage />);
    await screen.findByText('Budi');

    fireEvent.change(screen.getByPlaceholderText('Cari nama...'), { target: { value: 'Budi' } });
    fireEvent.change(screen.getByPlaceholderText('Cari email...'), { target: { value: 'budi@example.com' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'BURUH' } });
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));

    await waitFor(() => {
      expect(identityService.listUsers).toHaveBeenLastCalledWith({
        name: 'Budi',
        email: 'budi@example.com',
        role: 'BURUH',
      });
    });
  });

  it('filters users with undefined fields when search fields are blank', async () => {
    render(<IdentityPage />);
    await screen.findByText('Budi');
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    await waitFor(() => {
      expect(identityService.listUsers).toHaveBeenLastCalledWith({
        name: undefined,
        email: undefined,
        role: '',
      });
    });
  });

  it('shows filter error from Error', async () => {
    (identityService.listUsers as jest.Mock)
      .mockResolvedValueOnce(sampleUsers)
      .mockRejectedValueOnce(new Error('Filter blew up'));
    render(<IdentityPage />);
    await screen.findByText('Budi');
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(await screen.findByText('Filter blew up')).toBeInTheDocument();
  });

  it('shows fallback filter error when thrown value is not Error', async () => {
    (identityService.listUsers as jest.Mock)
      .mockResolvedValueOnce(sampleUsers)
      .mockRejectedValueOnce('bad');
    render(<IdentityPage />);
    await screen.findByText('Budi');
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(await screen.findByText('Filter gagal')).toBeInTheDocument();
  });

  it('assigns mandor via the assignment form', async () => {
    render(<IdentityPage />);
    await openAssignTab();

    const form = getAssignForm();
    const selects = within(form).getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'u-1' } });
    fireEvent.change(selects[1], { target: { value: 'u-2' } });
    fireEvent.click(within(form).getByRole('button', { name: /^simpan penugasan$/i }));

    await waitFor(() => {
      expect(identityService.assignMandor).toHaveBeenCalledWith('u-1', { mandorId: 'u-2' });
    });
  });

  it('shows assign error from Error', async () => {
    (identityService.assignMandor as jest.Mock).mockRejectedValue(new Error('Assign failed'));
    render(<IdentityPage />);
    await openAssignTab();
    const form = getAssignForm();
    const selects = within(form).getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'u-1' } });
    fireEvent.change(selects[1], { target: { value: 'u-2' } });
    fireEvent.click(within(form).getByRole('button', { name: /^simpan penugasan$/i }));
    expect(await screen.findByText('Assign failed')).toBeInTheDocument();
  });

  it('shows fallback assign error when thrown value is not Error', async () => {
    (identityService.assignMandor as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    await openAssignTab();
    const form = getAssignForm();
    const selects = within(form).getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'u-1' } });
    fireEvent.change(selects[1], { target: { value: 'u-2' } });
    fireEvent.click(within(form).getByRole('button', { name: /^simpan penugasan$/i }));
    expect(await screen.findByText('Gagal assign mandor')).toBeInTheDocument();
  });

  it('unassigns mandor for a BURUH row with mandor', async () => {
    render(<IdentityPage />);
    const row = (await screen.findByText('Budi')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /copot/i }));
    await waitFor(() => expect(identityService.unassignMandor).toHaveBeenCalledWith('u-1'));
  });

  it('shows unassign error from Error', async () => {
    (identityService.unassignMandor as jest.Mock).mockRejectedValue(new Error('Unassign failed'));
    render(<IdentityPage />);
    const row = (await screen.findByText('Budi')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /copot/i }));
    expect(await screen.findByText('Unassign failed')).toBeInTheDocument();
  });

  it('shows fallback unassign error when thrown value is not Error', async () => {
    (identityService.unassignMandor as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    const row = (await screen.findByText('Budi')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /copot/i }));
    expect(await screen.findByText('Gagal unassign')).toBeInTheDocument();
  });

  it('deletes a user after confirmation', async () => {
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /hapus/i }));
    await waitFor(() => expect(identityService.deleteUser).toHaveBeenCalledWith('u-2'));
  });

  it('does not delete when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /hapus/i }));
    expect(identityService.deleteUser).not.toHaveBeenCalled();
  });

  it('shows delete error from Error', async () => {
    (identityService.deleteUser as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /hapus/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (identityService.deleteUser as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /hapus/i }));
    expect(await screen.findByText('Gagal hapus user')).toBeInTheDocument();
  });

  it('shows empty state when no users are returned', async () => {
    (identityService.listUsers as jest.Mock).mockResolvedValue([]);
    render(<IdentityPage />);
    expect(await screen.findByText(/Tidak ada anggota ditemukan/i)).toBeInTheDocument();
  });

  it('shows loading indicator while filter is in flight', async () => {
    let resolveFilter: ((value: unknown) => void) | undefined;
    (identityService.listUsers as jest.Mock)
      .mockResolvedValueOnce(sampleUsers)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFilter = resolve; }));
    render(<IdentityPage />);
    await screen.findByText('Budi');
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(await screen.findByText(/Memuat data tim/i)).toBeInTheDocument();
    resolveFilter?.([]);
    await screen.findByText(/Tidak ada anggota ditemukan/i);
  });
});
