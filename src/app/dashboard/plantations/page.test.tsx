import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlantationsPage from './page';
import { plantationService } from '@/services/plantation.service';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();
const routerMock = { push: pushMock };
const confirmMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/services/plantation.service', () => ({
  plantationService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assignMandor: jest.fn(),
    transferMandor: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    getUserInfo: jest.fn(),
  },
}));

describe('PlantationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;

    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: '10' });
    (plantationService.getAll as jest.Mock).mockResolvedValue([]);
    (plantationService.create as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.update as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.delete as jest.Mock).mockResolvedValue({ message: 'deleted' });
    (plantationService.assignMandor as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.transferMandor as jest.Mock).mockResolvedValue(undefined);
    confirmMock.mockReturnValue(true);
  });

  const openAndFillForm = () => {
    fireEvent.click(screen.getByRole('button', { name: /add plantation/i }));

    fireEvent.change(screen.getByLabelText(/plantation name/i), {
      target: { value: 'Plantation A' },
    });
    fireEvent.change(screen.getByLabelText(/^location$/i), {
      target: { value: 'Riau' },
    });
    fireEvent.change(screen.getByLabelText(/area/i), {
      target: { value: '15.5' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Sample plantation' },
    });
  };

  it('redirects to login when user is not authenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);

    render(<PlantationsPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });

    expect(plantationService.getAll).not.toHaveBeenCalled();
  });

  it('shows loading state while fetching plantations', async () => {
    let resolvePromise: ((value: unknown) => void) | undefined;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (plantationService.getAll as jest.Mock).mockReturnValue(pendingPromise);

    render(<PlantationsPage />);

    expect(screen.getByText(/loading plantations/i)).toBeInTheDocument();

    resolvePromise?.([]);
    await waitFor(() => {
      expect(plantationService.getAll).toHaveBeenCalledTimes(1);
    });
  });

  it('shows empty state when no plantations exist', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([]);

    render(<PlantationsPage />);

    expect(await screen.findByText(/no plantations yet/i)).toBeInTheDocument();
  });

  it('renders plantations list including optional description', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Plantation A',
        location: 'Riau',
        area: 10,
        description: 'With description',
      },
      {
        id: 2,
        name: 'Plantation B',
        location: 'Jambi',
        area: 11,
      },
    ]);

    render(<PlantationsPage />);

    expect(await screen.findByText('Plantation A')).toBeInTheDocument();
    expect(screen.getByText(/with description/i)).toBeInTheDocument();
    expect(screen.getByText('Plantation B')).toBeInTheDocument();
  });

  it('shows load error message from Error object', async () => {
    (plantationService.getAll as jest.Mock).mockRejectedValue(new Error('Failed to load from API'));

    render(<PlantationsPage />);

    expect(await screen.findByText('Failed to load from API')).toBeInTheDocument();
  });

  it('shows fallback load error when thrown value is not Error', async () => {
    (plantationService.getAll as jest.Mock).mockRejectedValue('bad');

    render(<PlantationsPage />);

    expect(await screen.findByText('Failed to load plantations')).toBeInTheDocument();
  });

  it('toggles add plantation form visibility', async () => {
    render(<PlantationsPage />);

    await screen.findByText(/no plantations yet/i);

    const addButton = screen.getByRole('button', { name: /add plantation/i });
    fireEvent.click(addButton);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /add plantation/i })).toBeInTheDocument();
  });

  it('creates plantation with session owner id and reloads list', async () => {
    (plantationService.getAll as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: '10' });

    render(<PlantationsPage />);

    await screen.findByText(/no plantations yet/i);
    openAndFillForm();

    fireEvent.click(screen.getByRole('button', { name: /create plantation/i }));

    await waitFor(() => {
      expect(plantationService.create).toHaveBeenCalledWith({
        name: 'Plantation A',
        location: 'Riau',
        area: 15.5,
        description: 'Sample plantation',
        ownerId: '10',
        plantDate: undefined,
        coordinates: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
          { latitude: 1, longitude: 0 },
        ],
      });
    });

    await waitFor(() => {
      expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByRole('button', { name: /add plantation/i })).toBeInTheDocument();
  });

  it('creates plantation with undefined owner id when user info is missing', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue(null);

    render(<PlantationsPage />);

    await screen.findByText(/no plantations yet/i);
    openAndFillForm();

    fireEvent.click(screen.getByRole('button', { name: /create plantation/i }));

    await waitFor(() => {
      expect(plantationService.create).toHaveBeenCalledWith({
        name: 'Plantation A',
        location: 'Riau',
        area: 15.5,
        description: 'Sample plantation',
        ownerId: undefined,
        plantDate: undefined,
        coordinates: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
          { latitude: 1, longitude: 0 },
        ],
      });
    });
  });

  it('shows create error message from Error object', async () => {
    (plantationService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));

    render(<PlantationsPage />);

    await screen.findByText(/no plantations yet/i);
    openAndFillForm();

    fireEvent.click(screen.getByRole('button', { name: /create plantation/i }));

    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (plantationService.create as jest.Mock).mockRejectedValue('bad');

    render(<PlantationsPage />);

    await screen.findByText(/no plantations yet/i);
    openAndFillForm();

    fireEvent.click(screen.getByRole('button', { name: /create plantation/i }));

    expect(await screen.findByText('Failed to create plantation')).toBeInTheDocument();
  });

  it('does not delete when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Plantation A', location: 'Riau', area: 10 },
    ]);

    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));

    expect(plantationService.delete).not.toHaveBeenCalled();
  });

  it('deletes plantation and reloads list when confirmed', async () => {
    (plantationService.getAll as jest.Mock)
      .mockResolvedValueOnce([{ id: 1, name: 'Plantation A', location: 'Riau', area: 10 }])
      .mockResolvedValueOnce([]);

    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(plantationService.delete).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows delete error message from Error object', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Plantation A', location: 'Riau', area: 10 },
    ]);
    (plantationService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));

    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Plantation A', location: 'Riau', area: 10 },
    ]);
    (plantationService.delete as jest.Mock).mockRejectedValue('bad');

    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));

    expect(await screen.findByText('Failed to delete plantation')).toBeInTheDocument();
  });
});
