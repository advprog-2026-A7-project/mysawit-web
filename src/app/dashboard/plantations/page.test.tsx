import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlantationsPage from './page';
import { plantationService } from '@/services/plantation.service';

const confirmMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
    getByOwner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assignMandor: jest.fn(),
    transferMandor: jest.fn(),
  },
}));

let mockAuth: { user: { id: string } | null } = { user: { id: '10' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('PlantationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: { id: '10' } };
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    (plantationService.getAll as jest.Mock).mockResolvedValue([]);
    (plantationService.getByOwner as jest.Mock).mockResolvedValue([]);
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
    mockAuth = { user: null };

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

  it('renders plantation card with coordinates list and parses plantDate', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 5,
        code: 'P-005',
        name: 'Plantation D',
        location: 'Lampung',
        area: 12,
        ownerId: 'owner-5',
        mandorId: 'mandor-5',
        plantDate: '2026-01-15T10:00:00Z',
        coordinates: [
          { latitude: 1, longitude: 2 },
          { latitude: 3, longitude: 4 },
          { latitude: 5, longitude: 6 },
          { latitude: 7, longitude: 8 },
        ],
      },
      {
        id: 6,
        name: 'Plantation E',
        location: 'Bengkulu',
        area: 5,
        plantDate: 'not-a-date',
      },
    ]);

    render(<PlantationsPage />);
    expect(await screen.findByText('Plantation D')).toBeInTheDocument();
    expect(screen.getByText('P-005')).toBeInTheDocument();
    expect(screen.getByText(/1, 2/)).toBeInTheDocument();
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
    expect(screen.getByText('ID 6')).toBeInTheDocument();
  });

  it('filters plantations by owner and resets', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.change(screen.getByPlaceholderText('Owner ID'), { target: { value: 'owner-x' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));

    await waitFor(() => expect(plantationService.getByOwner).toHaveBeenCalledWith('owner-x'));

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() => {
      expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('opens edit form for plantation with invalid plantDate and short coordinates list, restoring defaults', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 11,
        name: 'Plantation H',
        location: 'Kalbar',
        area: 8,
        plantDate: 'not-a-date',
        coordinates: [{ latitude: 1, longitude: 1 }],
      },
    ]);
    render(<PlantationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /edit/i }));
    // toDateTimeInput returns '' for invalid date
    expect((screen.getByLabelText(/plant date/i) as HTMLInputElement).value).toBe('');
    // toCoordinateForm returns the 4 defaults when input length != 4
    expect((screen.getByLabelText(/latitude 1/i) as HTMLInputElement).value).toBe('0');
    expect((screen.getByLabelText(/latitude 4/i) as HTMLInputElement).value).toBe('1');
  });

  it('opens edit form, updates coordinates, and dispatches update', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValueOnce([
      {
        id: 7,
        name: 'Plantation F',
        location: 'Aceh',
        area: 9,
        ownerId: 'owner-7',
        description: 'Existing',
        plantDate: '2026-02-01T08:00:00Z',
        coordinates: [
          { latitude: 0.1, longitude: 0.2 },
          { latitude: 0.3, longitude: 0.4 },
          { latitude: 0.5, longitude: 0.6 },
          { latitude: 0.7, longitude: 0.8 },
        ],
      },
    ]);

    render(<PlantationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /edit/i }));

    expect((screen.getByLabelText(/plantation name/i) as HTMLInputElement).value).toBe('Plantation F');
    expect((screen.getByLabelText(/owner id/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/latitude 1/i) as HTMLInputElement).value).toBe('0.1');

    fireEvent.change(screen.getByLabelText(/latitude 1/i), { target: { value: '9.9' } });
    fireEvent.change(screen.getByLabelText(/longitude 1/i), { target: { value: '8.8' } });
    fireEvent.click(screen.getByRole('button', { name: /^update plantation$/i }));

    await waitFor(() => {
      expect(plantationService.update).toHaveBeenCalledWith(
        '7',
        expect.objectContaining({
          name: 'Plantation F',
          coordinates: [
            { latitude: 9.9, longitude: 8.8 },
            { latitude: 0.3, longitude: 0.4 },
            { latitude: 0.5, longitude: 0.6 },
            { latitude: 0.7, longitude: 0.8 },
          ],
        })
      );
    });
  });

  it('shows update error from Error and from non-Error', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 9,
        name: 'Plantation G',
        location: 'Sumut',
        area: 4,
        coordinates: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
          { latitude: 1, longitude: 0 },
        ],
      },
    ]);
    (plantationService.update as jest.Mock).mockRejectedValueOnce(new Error('Update specific'));

    render(<PlantationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /edit/i }));
    fireEvent.click(screen.getByRole('button', { name: /^update plantation$/i }));
    expect(await screen.findByText('Update specific')).toBeInTheDocument();

    (plantationService.update as jest.Mock).mockRejectedValueOnce('boom');
    fireEvent.click(screen.getByRole('button', { name: /^update plantation$/i }));
    expect(await screen.findByText('Failed to update plantation')).toBeInTheDocument();
  });

  it('rejects submission when coordinates are invalid', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    openAndFillForm();
    // Force a NaN coordinate by clearing the latitude and submitting the form
    // directly (bypassing native HTML5 validation).
    const lat = screen.getByLabelText(/latitude 1/i) as HTMLInputElement;
    fireEvent.change(lat, { target: { value: '' } });
    const form = lat.closest('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(await screen.findByText(/Exactly 4 valid coordinates are required/i)).toBeInTheDocument();
    expect(plantationService.create).not.toHaveBeenCalled();
  });

  it('updates every coordinate latitude and longitude input', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add plantation/i }));

    for (let i = 1; i <= 4; i += 1) {
      fireEvent.change(screen.getByLabelText(new RegExp(`^Latitude ${i}$`, 'i')), { target: { value: String(i) } });
      fireEvent.change(screen.getByLabelText(new RegExp(`^Longitude ${i}$`, 'i')), { target: { value: String(i + 10) } });
    }

    expect((screen.getByLabelText(/^latitude 4$/i) as HTMLInputElement).value).toBe('4');
    expect((screen.getByLabelText(/^longitude 4$/i) as HTMLInputElement).value).toBe('14');
  });

  it('handles datetime-local plant date input and forwards to service', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    openAndFillForm();
    fireEvent.change(screen.getByLabelText(/plant date/i), { target: { value: '2026-03-04T05:06' } });
    fireEvent.click(screen.getByRole('button', { name: /create plantation/i }));

    await waitFor(() => {
      expect(plantationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ plantDate: '2026-03-04T05:06' })
      );
    });
  });

  it('assigns mandor to plantation via the assign form', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.change(screen.getByPlaceholderText('Plantation ID'), { target: { value: '4' } });
    fireEvent.change(screen.getAllByPlaceholderText('Mandor ID')[0], { target: { value: 'mandor-4' } });
    fireEvent.click(screen.getByRole('button', { name: /^assign mandor$/i }));

    await waitFor(() => {
      expect(plantationService.assignMandor).toHaveBeenCalledWith('4', { mandorId: 'mandor-4' });
    });
  });

  it('shows assign mandor errors from Error and non-Error', async () => {
    (plantationService.assignMandor as jest.Mock).mockRejectedValueOnce(new Error('Assign blew up'));
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.change(screen.getByPlaceholderText('Plantation ID'), { target: { value: '4' } });
    fireEvent.change(screen.getAllByPlaceholderText('Mandor ID')[0], { target: { value: 'mandor-4' } });
    fireEvent.click(screen.getByRole('button', { name: /^assign mandor$/i }));
    expect(await screen.findByText('Assign blew up')).toBeInTheDocument();

    (plantationService.assignMandor as jest.Mock).mockRejectedValueOnce('bad');
    fireEvent.change(screen.getByPlaceholderText('Plantation ID'), { target: { value: '4' } });
    fireEvent.change(screen.getAllByPlaceholderText('Mandor ID')[0], { target: { value: 'mandor-4' } });
    fireEvent.click(screen.getByRole('button', { name: /^assign mandor$/i }));
    expect(await screen.findByText('Failed to assign mandor')).toBeInTheDocument();
  });

  it('transfers mandor between plantations', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    const mandorInputs = screen.getAllByPlaceholderText('Mandor ID');
    fireEvent.change(mandorInputs[mandorInputs.length - 1], { target: { value: 'mandor-7' } });
    fireEvent.change(screen.getByPlaceholderText('From Plantation ID'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('To Plantation ID'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /^transfer mandor$/i }));

    await waitFor(() => {
      expect(plantationService.transferMandor).toHaveBeenCalledWith({
        mandorId: 'mandor-7',
        fromPlantationId: '1',
        toPlantationId: '2',
      });
    });
  });

  it('shows transfer mandor errors from Error and non-Error', async () => {
    (plantationService.transferMandor as jest.Mock).mockRejectedValueOnce(new Error('Transfer blew up'));
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    const mandorInputs = screen.getAllByPlaceholderText('Mandor ID');
    fireEvent.change(mandorInputs[mandorInputs.length - 1], { target: { value: 'mandor-7' } });
    fireEvent.change(screen.getByPlaceholderText('From Plantation ID'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('To Plantation ID'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /^transfer mandor$/i }));
    expect(await screen.findByText('Transfer blew up')).toBeInTheDocument();

    (plantationService.transferMandor as jest.Mock).mockRejectedValueOnce('bad');
    fireEvent.change(mandorInputs[mandorInputs.length - 1], { target: { value: 'mandor-7' } });
    fireEvent.change(screen.getByPlaceholderText('From Plantation ID'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('To Plantation ID'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /^transfer mandor$/i }));
    expect(await screen.findByText('Failed to transfer mandor')).toBeInTheDocument();
  });

});
