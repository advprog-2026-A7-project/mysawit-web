import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PlantationsPage from './page';
import { plantationService } from '@/services/plantation.service';
import { identityService } from '@/services/identity.service';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
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

jest.mock('@/services/identity.service', () => ({
  identityService: {
    listUsers: jest.fn(),
  },
}));

const defaultCoords = [
  { latitude: 0.1, longitude: 0.2 },
  { latitude: 0.3, longitude: 0.4 },
  { latitude: 0.5, longitude: 0.6 },
  { latitude: 0.7, longitude: 0.8 },
];

describe('PlantationsPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (plantationService.getAll as jest.Mock).mockResolvedValue([]);
    (plantationService.getByOwner as jest.Mock).mockResolvedValue([]);
    (plantationService.create as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.update as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.delete as jest.Mock).mockResolvedValue({ message: 'ok' });
    (plantationService.assignMandor as jest.Mock).mockResolvedValue({ message: 'ok' });
    (plantationService.transferMandor as jest.Mock).mockResolvedValue(undefined);
    (identityService.listUsers as jest.Mock).mockResolvedValue([]);
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  // -------- loading / empty / list rendering --------

  it('shows the loading state while fetching', () => {
    let resolve: ((value: unknown) => void) | undefined;
    (plantationService.getAll as jest.Mock).mockReturnValue(
      new Promise((r) => { resolve = r; })
    );
    render(<PlantationsPage />);
    expect(screen.getByText(/loading plantations/i)).toBeInTheDocument();
    resolve?.([]);
  });

  it('shows the empty state when no plantations are returned', async () => {
    render(<PlantationsPage />);
    expect(await screen.findByText(/no plantations yet/i)).toBeInTheDocument();
  });

  it('renders cards with code, ID-fallback, description, coordinates list, and formatted plant date', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 5,
        code: 'P-005',
        name: 'Plantation D',
        location: 'Lampung',
        area: 12,
        ownerId: 'owner-5',
        mandorId: 'mandor-5',
        description: 'Sample',
        plantDate: '2026-01-15T10:00:00Z',
        coordinates: [
          { latitude: 1, longitude: 2 },
          { latitude: 3, longitude: 4 },
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
    expect(screen.getByText('ID 6')).toBeInTheDocument();
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.getByText('1, 2 | 3, 4')).toBeInTheDocument();
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
  });

  it('uses "-" placeholders for missing owner, mandor, and plantDate; hides description and coordinates rows', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Bare', location: 'X', area: 1 },
    ]);
    render(<PlantationsPage />);
    const heading = await screen.findByText('Bare');
    const card = heading.closest('div.bg-white') as HTMLElement;
    expect(within(card).getAllByText('-').length).toBeGreaterThanOrEqual(3);
    expect(within(card).queryByText(/description:/i)).not.toBeInTheDocument();
    expect(within(card).queryByText(/coordinates:/i)).not.toBeInTheDocument();
  });

  it('computes summary memo (total area + assigned mandor count)', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', location: 'X', area: 10, mandorId: 'm1' },
      { id: 2, name: 'B', location: 'Y', area: 20 },
      { id: 3, name: 'C', location: 'Z', area: 5, mandorId: 'm2' },
    ]);
    render(<PlantationsPage />);
    await screen.findByText('A');
    expect(screen.getByText('Total Plantations').parentElement!.textContent).toMatch(/3/);
    expect(screen.getByText('Total Area').parentElement!.textContent).toMatch(/35/);
    expect(screen.getByText('Assigned Mandor').parentElement!.textContent).toMatch(/2/);
  });

  // -------- load errors --------

  it('shows load error from Error', async () => {
    (plantationService.getAll as jest.Mock).mockRejectedValue(new Error('Load failed'));
    render(<PlantationsPage />);
    expect(await screen.findByText('Load failed')).toBeInTheDocument();
  });

  it('shows fallback load error when thrown value is not Error', async () => {
    (plantationService.getAll as jest.Mock).mockRejectedValue('boom');
    render(<PlantationsPage />);
    expect(await screen.findByText(/failed to load plantations/i)).toBeInTheDocument();
  });

  // -------- mandor list effect --------

  it('falls back to empty mandor list when identityService.listUsers throws', async () => {
    (identityService.listUsers as jest.Mock).mockRejectedValue(new Error('mandor list down'));
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    // The Mandor select in Assign form should only show its placeholder option (no mandors loaded).
    const assignForm = screen.getByRole('heading', { name: /^assign mandor$/i }).closest('form') as HTMLFormElement;
    const mandorSelect = within(assignForm).getByLabelText('Mandor') as HTMLSelectElement;
    expect(mandorSelect.querySelectorAll('option')).toHaveLength(1);
  });

  // -------- filter --------

  it('filters by ownerId on submit and resets via the Reset button', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.change(screen.getByPlaceholderText(/owner id/i), { target: { value: 'owner-x' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));

    await waitFor(() => {
      expect(plantationService.getByOwner).toHaveBeenCalledWith('owner-x');
    });

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(screen.getByPlaceholderText(/owner id/i)).toHaveValue('');
    await waitFor(() => {
      // getAll initial + reset → at least 2 calls.
      expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // -------- toggle add form --------

  it('toggles between "+ Add Plantation" and "Cancel" and clears form state on cancel', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    expect(screen.getByRole('heading', { level: 2, name: /add new plantation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('heading', { level: 2, name: /add new plantation/i })).not.toBeInTheDocument();
  });

  // -------- create --------

  it('creates plantation with default coordinates and undefined ownerId / plantDate / description', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'Plantation A' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '15.5' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^create plantation$/i }));
    });

    await waitFor(() => {
      expect(plantationService.create).toHaveBeenCalledWith({
        name: 'Plantation A',
        location: '-',
        area: 15.5,
        ownerId: undefined,
        description: undefined,
        plantDate: undefined,
        coordinates: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
          { latitude: 1, longitude: 0 },
        ],
      });
    });
    // Form closes after success.
    expect(screen.queryByRole('heading', { level: 2, name: /add new plantation/i })).not.toBeInTheDocument();
    // Reloaded.
    await waitFor(() => {
      expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('creates plantation with description and plant date forwarded as YYYY-MM-DDT00:00:00', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'desc' } });
    fireEvent.change(screen.getByLabelText(/plant date/i), { target: { value: '2026-03-04' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^create plantation$/i }));
    });

    await waitFor(() => {
      expect(plantationService.create).toHaveBeenCalledWith(expect.objectContaining({
        description: 'desc',
        plantDate: '2026-03-04T00:00:00',
      }));
    });
  });

  it('rejects submission with an invalid coordinate set (NaN latitude)', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '1' } });
    // Force NaN by clearing latitude 1.
    fireEvent.change(screen.getByLabelText(/^latitude 1$/i), { target: { value: '' } });

    const form = screen.getByRole('heading', { level: 2, name: /add new plantation/i })
      .closest('div')!
      .querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(await screen.findByText(/exactly 4 valid coordinates are required/i)).toBeInTheDocument();
    expect(plantationService.create).not.toHaveBeenCalled();
  });

  it('shows transient "Saving Plantation..." while create is in flight', async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    (plantationService.create as jest.Mock).mockReturnValue(
      new Promise((r) => { resolveCreate = r; })
    );

    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^create plantation$/i }));
    });
    expect(screen.getByRole('button', { name: /saving plantation/i })).toBeDisabled();

    await act(async () => {
      resolveCreate?.({ id: 1 });
    });
  });

  it('shows create error from Error', async () => {
    (plantationService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^create plantation$/i }));
    });
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (plantationService.create as jest.Mock).mockRejectedValue('boom');
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '1' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^create plantation$/i }));
    });
    expect(await screen.findByText(/failed to create plantation/i)).toBeInTheDocument();
  });

  // -------- edit / update --------

  it('opens edit form pre-populated and updates a coordinate via update()', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 7,
        name: 'Plantation F',
        location: 'Aceh',
        area: 9,
        description: 'Existing',
        plantDate: '2026-02-01T08:00:00Z',
        coordinates: defaultCoords,
      },
    ]);
    render(<PlantationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }));

    expect(screen.getByRole('heading', { level: 2, name: /update plantation/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/plantation name/i) as HTMLInputElement).value).toBe('Plantation F');
    expect((screen.getByLabelText(/area \(hectares\)/i) as HTMLInputElement).value).toBe('9');
    expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe('Existing');
    expect((screen.getByLabelText(/^latitude 1$/i) as HTMLInputElement).value).toBe('0.1');
    expect((screen.getByLabelText(/plant date/i) as HTMLInputElement).value).toBe('2026-02-01');

    fireEvent.change(screen.getByLabelText(/^latitude 1$/i), { target: { value: '9.9' } });
    fireEvent.change(screen.getByLabelText(/^longitude 1$/i), { target: { value: '8.8' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^update plantation$/i }));
    });

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

  it('edit form falls back to default coordinates when plantation has wrong-length coordinate set, and empty plant date for invalid date', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }));

    expect((screen.getByLabelText(/plant date/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/^latitude 1$/i) as HTMLInputElement).value).toBe('0');
    expect((screen.getByLabelText(/^latitude 4$/i) as HTMLInputElement).value).toBe('1');
  });

  it('edit form falls back to empty description and empty plant date when those fields are missing', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 12, name: 'Plantation I', location: 'X', area: 4 },
    ]);
    render(<PlantationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }));
    expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe('');
    expect((screen.getByLabelText(/plant date/i) as HTMLInputElement).value).toBe('');
  });

  it('shows update error from Error and fallback for non-Error', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 9, name: 'G', location: 'X', area: 4, coordinates: defaultCoords },
    ]);
    (plantationService.update as jest.Mock).mockRejectedValueOnce(new Error('Update specific'));

    render(<PlantationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^update plantation$/i }));
    });
    expect(await screen.findByText('Update specific')).toBeInTheDocument();

    (plantationService.update as jest.Mock).mockRejectedValueOnce('boom');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^update plantation$/i }));
    });
    expect(await screen.findByText(/failed to update plantation/i)).toBeInTheDocument();
  });

  // -------- delete --------

  it('delete: confirm declined does not call the service', async () => {
    confirmSpy.mockReturnValue(false);
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', location: 'X', area: 1 },
    ]);
    render(<PlantationsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    expect(plantationService.delete).not.toHaveBeenCalled();
  });

  it('delete: confirm accepted calls service and reloads', async () => {
    (plantationService.getAll as jest.Mock)
      .mockResolvedValueOnce([{ id: 1, name: 'A', location: 'X', area: 1 }])
      .mockResolvedValueOnce([]);
    render(<PlantationsPage />);
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    });
    await waitFor(() => {
      expect(plantationService.delete).toHaveBeenCalledWith(1);
    });
    await waitFor(() => {
      expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows delete error from Error', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', location: 'X', area: 1 },
    ]);
    (plantationService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<PlantationsPage />);
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    });
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', location: 'X', area: 1 },
    ]);
    (plantationService.delete as jest.Mock).mockRejectedValue('boom');
    render(<PlantationsPage />);
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /^delete$/i }));
    });
    expect(await screen.findByText(/failed to delete plantation/i)).toBeInTheDocument();
  });

  // -------- assign mandor --------

  it('assigns mandor via the assign form: selects plantation + mandor, posts, resets, reloads', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', code: 'P-001', location: 'X', area: 1 },
    ]);
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'm1', username: 'mandor1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    render(<PlantationsPage />);
    await screen.findByText('A');

    const assignForm = screen.getByRole('heading', { name: /^assign mandor$/i }).closest('form') as HTMLFormElement;
    fireEvent.change(within(assignForm).getByLabelText('Plantation'), { target: { value: '1' } });
    fireEvent.change(within(assignForm).getByLabelText('Mandor'), { target: { value: 'm1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /^assign mandor$/i }));

    await waitFor(() => {
      expect(plantationService.assignMandor).toHaveBeenCalledWith('1', { mandorId: 'm1' });
    });
    // Form selects reset.
    expect((within(assignForm).getByLabelText('Plantation') as HTMLSelectElement).value).toBe('');
    expect((within(assignForm).getByLabelText('Mandor') as HTMLSelectElement).value).toBe('');
  });

  it('renders mandor option label fallback to username when name is empty', async () => {
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'm1', username: 'mandor1', email: 'm1@mail.com', name: '', role: 'MANDOR' },
    ]);
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);

    const assignForm = screen.getByRole('heading', { name: /^assign mandor$/i }).closest('form') as HTMLFormElement;
    const mandorSelect = within(assignForm).getByLabelText('Mandor') as HTMLSelectElement;
    expect(within(mandorSelect).getByText(/mandor1 \(m1@mail\.com\)/)).toBeInTheDocument();
  });

  it('shows assign mandor errors from Error and fallback', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', location: 'X', area: 1 },
    ]);
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'm1', username: 'm1', email: 'm1@mail.com', name: 'Mandor One', role: 'MANDOR' },
    ]);
    (plantationService.assignMandor as jest.Mock).mockRejectedValueOnce(new Error('Assign failed'));

    render(<PlantationsPage />);
    await screen.findByText('A');

    const assignForm = screen.getByRole('heading', { name: /^assign mandor$/i }).closest('form') as HTMLFormElement;
    fireEvent.change(within(assignForm).getByLabelText('Plantation'), { target: { value: '1' } });
    fireEvent.change(within(assignForm).getByLabelText('Mandor'), { target: { value: 'm1' } });
    await act(async () => {
      fireEvent.click(within(assignForm).getByRole('button', { name: /^assign mandor$/i }));
    });
    expect(await screen.findByText('Assign failed')).toBeInTheDocument();

    (plantationService.assignMandor as jest.Mock).mockRejectedValueOnce('boom');
    fireEvent.change(within(assignForm).getByLabelText('Plantation'), { target: { value: '1' } });
    fireEvent.change(within(assignForm).getByLabelText('Mandor'), { target: { value: 'm1' } });
    await act(async () => {
      fireEvent.click(within(assignForm).getByRole('button', { name: /^assign mandor$/i }));
    });
    expect(await screen.findByText(/failed to assign mandor/i)).toBeInTheDocument();
  });

  // -------- transfer mandor --------

  it('transfers mandor: selects mandor + from + to, posts, resets, reloads', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', location: 'X', area: 1 },
      { id: 2, name: 'B', location: 'Y', area: 2 },
    ]);
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'm7', username: 'm7', email: 'm7@mail.com', name: 'M7', role: 'MANDOR' },
    ]);

    render(<PlantationsPage />);
    await screen.findByText('A');

    const transferForm = screen.getByRole('heading', { name: /^transfer mandor$/i }).closest('form') as HTMLFormElement;
    fireEvent.change(within(transferForm).getByLabelText('Mandor'), { target: { value: 'm7' } });
    fireEvent.change(within(transferForm).getByLabelText('From Plantation'), { target: { value: '1' } });
    fireEvent.change(within(transferForm).getByLabelText('To Plantation'), { target: { value: '2' } });
    fireEvent.click(within(transferForm).getByRole('button', { name: /^transfer mandor$/i }));

    await waitFor(() => {
      expect(plantationService.transferMandor).toHaveBeenCalledWith({
        mandorId: 'm7',
        fromPlantationId: '1',
        toPlantationId: '2',
      });
    });
    expect((within(transferForm).getByLabelText('Mandor') as HTMLSelectElement).value).toBe('');
  });

  it('shows transfer mandor errors from Error and fallback', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, name: 'A', location: 'X', area: 1 },
      { id: 2, name: 'B', location: 'Y', area: 2 },
    ]);
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'm7', username: 'm7', email: 'm7@mail.com', name: 'M7', role: 'MANDOR' },
    ]);
    (plantationService.transferMandor as jest.Mock).mockRejectedValueOnce(new Error('Transfer failed'));

    render(<PlantationsPage />);
    await screen.findByText('A');

    const transferForm = screen.getByRole('heading', { name: /^transfer mandor$/i }).closest('form') as HTMLFormElement;
    fireEvent.change(within(transferForm).getByLabelText('Mandor'), { target: { value: 'm7' } });
    fireEvent.change(within(transferForm).getByLabelText('From Plantation'), { target: { value: '1' } });
    fireEvent.change(within(transferForm).getByLabelText('To Plantation'), { target: { value: '2' } });
    await act(async () => {
      fireEvent.click(within(transferForm).getByRole('button', { name: /^transfer mandor$/i }));
    });
    expect(await screen.findByText('Transfer failed')).toBeInTheDocument();

    (plantationService.transferMandor as jest.Mock).mockRejectedValueOnce('boom');
    fireEvent.change(within(transferForm).getByLabelText('Mandor'), { target: { value: 'm7' } });
    fireEvent.change(within(transferForm).getByLabelText('From Plantation'), { target: { value: '1' } });
    fireEvent.change(within(transferForm).getByLabelText('To Plantation'), { target: { value: '2' } });
    await act(async () => {
      fireEvent.click(within(transferForm).getByRole('button', { name: /^transfer mandor$/i }));
    });
    expect(await screen.findByText(/failed to transfer mandor/i)).toBeInTheDocument();
  });

  // -------- coordinate updater touches all four points --------

  it('updateCoordinate writes to every latitude and longitude input independently', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));

    for (let i = 1; i <= 4; i += 1) {
      fireEvent.change(screen.getByLabelText(new RegExp(`^latitude ${i}$`, 'i')), { target: { value: String(i) } });
      fireEvent.change(screen.getByLabelText(new RegExp(`^longitude ${i}$`, 'i')), { target: { value: String(i + 10) } });
    }

    expect((screen.getByLabelText(/^latitude 4$/i) as HTMLInputElement).value).toBe('4');
    expect((screen.getByLabelText(/^longitude 4$/i) as HTMLInputElement).value).toBe('14');
  });
});
