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

  it('renders nothing and redirects to login when unauthenticated', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
    const { container } = render(<IdentityPage />);
    expect(pushMock).toHaveBeenCalledWith('/login');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders UP status, current session, and user table after successful load', async () => {
    render(<IdentityPage />);
    expect(await screen.findByText('UP')).toBeInTheDocument();
    expect(screen.getByText(/admin \(ADMIN\)/)).toBeInTheDocument();
    expect(screen.getByText('ID: me-1')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('sari')).toBeInTheDocument();
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
  });

  it('renders fallback labels when current user info is missing', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: null, username: null, role: null });
    render(<IdentityPage />);
    await screen.findByText('UP');
    expect(screen.getByText(/Unknown \(UNKNOWN\)/)).toBeInTheDocument();
    expect(screen.getByText('ID: -')).toBeInTheDocument();
  });

  it('shows DOWN status and error message when health check fails with Error', async () => {
    (authService.checkHealth as jest.Mock).mockRejectedValue(new Error('boom'));
    render(<IdentityPage />);
    expect(await screen.findByText('DOWN')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('shows fallback error when health check throws non-Error', async () => {
    (authService.checkHealth as jest.Mock).mockRejectedValue('weird');
    render(<IdentityPage />);
    expect(await screen.findByText(/Failed to contact identity service/i)).toBeInTheDocument();
  });

  it('shows DOWN when health status is not UP', async () => {
    (authService.checkHealth as jest.Mock).mockResolvedValue({ status: 'DEGRADED', service: 'identity' });
    render(<IdentityPage />);
    expect(await screen.findByText('DOWN')).toBeInTheDocument();
  });

  it('Refresh button re-invokes loadData', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => {
      expect((authService.checkHealth as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('Generate Identity button updates form values', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /generate identity/i }));
    expect((screen.getByPlaceholderText('Username') as HTMLInputElement).value).toContain('user.');
    expect((screen.getAllByPlaceholderText('Email')[0] as HTMLInputElement).value).toContain('@mysawit.local');
  });

  it('creates dummy user with optional fields filled and shows result panel', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getAllByPlaceholderText('Email')[0], { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'MANDOR' } });
    fireEvent.change(screen.getByPlaceholderText('Certification Number'), { target: { value: 'CERT-1' } });
    fireEvent.change(screen.getAllByPlaceholderText('Mandor ID')[0], { target: { value: 'mandor-x' } });
    fireEvent.change(screen.getByPlaceholderText('Kebun ID'), { target: { value: 'kebun-x' } });

    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));

    await waitFor(() => {
      expect(identityService.createDummyUser).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'secret1',
        role: 'MANDOR',
        certificationNumber: 'CERT-1',
        mandorId: 'mandor-x',
        kebunId: 'kebun-x',
      });
    });

    expect(await screen.findByText('User created')).toBeInTheDocument();
    expect(screen.getByText('ID: new-1')).toBeInTheDocument();
  });

  it('creates dummy user with undefined optional fields when blank', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'u1' } });
    fireEvent.change(screen.getAllByPlaceholderText('Email')[0], { target: { value: 'u1@x.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pwd-abc' } });
    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));

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
    await screen.findByText('UP');

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'first' } });
    fireEvent.change(screen.getAllByPlaceholderText('Email')[0], { target: { value: 'f@x.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));
    expect(await screen.findByText('User created')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
    expect(screen.queryByText('User created')).not.toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (identityService.createDummyUser as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'x' } });
    fireEvent.change(screen.getAllByPlaceholderText('Email')[0], { target: { value: 'x@y.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));
    expect(await screen.findByText('Failed to create user')).toBeInTheDocument();
  });

  it('shows saving label and disables button while creating', async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    (identityService.createDummyUser as jest.Mock).mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'x' } });
    fireEvent.change(screen.getAllByPlaceholderText('Email')[0], { target: { value: 'x@y.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));
    expect(await screen.findByRole('button', { name: /creating user/i })).toBeDisabled();
    resolveCreate?.({ id: 'r-1', username: 'x', role: 'BURUH', email: 'x@y.com', token: 't', type: 'Bearer' });
    await screen.findByText('User created');
  });

  it('filters users via the search form with values', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Budi' } });
    const emails = screen.getAllByPlaceholderText('Email');
    fireEvent.change(emails[emails.length - 1], { target: { value: 'budi@example.com' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'BURUH' } });
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
    await screen.findByText('UP');
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
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(await screen.findByText('Filter blew up')).toBeInTheDocument();
  });

  it('shows fallback filter error when thrown value is not Error', async () => {
    (identityService.listUsers as jest.Mock)
      .mockResolvedValueOnce(sampleUsers)
      .mockRejectedValueOnce('bad');
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(await screen.findByText('Failed to filter users')).toBeInTheDocument();
  });

  it('assigns mandor via the assignment form', async () => {
    render(<IdentityPage />);
    await screen.findByText('UP');

    const mandorInputs = screen.getAllByPlaceholderText('Mandor ID');
    fireEvent.change(screen.getByPlaceholderText('Buruh ID'), { target: { value: 'b-1' } });
    fireEvent.change(mandorInputs[mandorInputs.length - 1], { target: { value: 'm-9' } });
    fireEvent.click(screen.getByRole('button', { name: /assign mandor/i }));

    await waitFor(() => {
      expect(identityService.assignMandor).toHaveBeenCalledWith('b-1', { mandorId: 'm-9' });
    });
  });

  it('shows assign error from Error', async () => {
    (identityService.assignMandor as jest.Mock).mockRejectedValue(new Error('Assign failed'));
    render(<IdentityPage />);
    await screen.findByText('UP');
    const mandorInputs = screen.getAllByPlaceholderText('Mandor ID');
    fireEvent.change(screen.getByPlaceholderText('Buruh ID'), { target: { value: 'b-1' } });
    fireEvent.change(mandorInputs[mandorInputs.length - 1], { target: { value: 'm-9' } });
    fireEvent.click(screen.getByRole('button', { name: /assign mandor/i }));
    expect(await screen.findByText('Assign failed')).toBeInTheDocument();
  });

  it('shows fallback assign error when thrown value is not Error', async () => {
    (identityService.assignMandor as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    await screen.findByText('UP');
    const mandorInputs = screen.getAllByPlaceholderText('Mandor ID');
    fireEvent.change(screen.getByPlaceholderText('Buruh ID'), { target: { value: 'b-1' } });
    fireEvent.change(mandorInputs[mandorInputs.length - 1], { target: { value: 'm-9' } });
    fireEvent.click(screen.getByRole('button', { name: /assign mandor/i }));
    expect(await screen.findByText('Failed to assign mandor')).toBeInTheDocument();
  });

  it('unassigns mandor for a BURUH row with mandor', async () => {
    render(<IdentityPage />);
    const row = (await screen.findByText('Budi')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /unassign/i }));
    await waitFor(() => expect(identityService.unassignMandor).toHaveBeenCalledWith('u-1'));
  });

  it('shows unassign error from Error', async () => {
    (identityService.unassignMandor as jest.Mock).mockRejectedValue(new Error('Unassign failed'));
    render(<IdentityPage />);
    const row = (await screen.findByText('Budi')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /unassign/i }));
    expect(await screen.findByText('Unassign failed')).toBeInTheDocument();
  });

  it('shows fallback unassign error when thrown value is not Error', async () => {
    (identityService.unassignMandor as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    const row = (await screen.findByText('Budi')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /unassign/i }));
    expect(await screen.findByText('Failed to unassign mandor')).toBeInTheDocument();
  });

  it('deletes a user after confirmation', async () => {
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(identityService.deleteUser).toHaveBeenCalledWith('u-2'));
  });

  it('does not delete when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /delete/i }));
    expect(identityService.deleteUser).not.toHaveBeenCalled();
  });

  it('shows delete error from Error', async () => {
    (identityService.deleteUser as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (identityService.deleteUser as jest.Mock).mockRejectedValue('bad');
    render(<IdentityPage />);
    const row = (await screen.findByText('sari')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Failed to delete user')).toBeInTheDocument();
  });

  it('shows empty state when no users are returned', async () => {
    (identityService.listUsers as jest.Mock).mockResolvedValue([]);
    render(<IdentityPage />);
    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
  });

  it('shows loading indicator while filter is in flight', async () => {
    let resolveFilter: ((value: unknown) => void) | undefined;
    (identityService.listUsers as jest.Mock)
      .mockResolvedValueOnce(sampleUsers)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFilter = resolve; }));
    render(<IdentityPage />);
    await screen.findByText('UP');
    fireEvent.click(screen.getByRole('button', { name: /^filter$/i }));
    expect(await screen.findByText(/loading users/i)).toBeInTheDocument();
    resolveFilter?.([]);
    await screen.findByText(/no users found/i);
  });
});
