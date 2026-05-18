import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PlantationsPage from './page';
import { plantationService } from '@/services/plantation.service';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';

const confirmMock = jest.fn();

jest.mock('@/services/plantation.service', () => ({
  plantationService: {
    getAll: jest.fn(),
    getByOwner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assignMandor: jest.fn(),
    unassignMandor: jest.fn(),
    transferMandor: jest.fn(),
    getSupirs: jest.fn(),
    assignSupir: jest.fn(),
    unassignSupir: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/identity.service', () => ({
  identityService: {
    listUsers: jest.fn(),
  },
}));

const samplePlantation = {
  id: 1,
  code: 'P-001',
  name: 'Plantation A',
  location: 'Riau',
  area: 10,
  ownerId: 'owner-1',
  description: 'With description',
  mandorId: 'mandor-123456',
  supirIds: ['supir-1', 'supir-2'],
  plantDate: '2026-01-15T10:00:00Z',
  coordinates: [
    { latitude: 1, longitude: 2 },
    { latitude: 3, longitude: 4 },
    { latitude: 5, longitude: 6 },
    { latitude: 7, longitude: 8 },
  ],
};

describe('PlantationsPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    confirmMock.mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: '10' });
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'supir-1', username: 'driver', role: 'SUPIR' },
      { id: 'mandor-1', username: 'foreman', role: 'MANDOR' },
    ]);
    (plantationService.getAll as jest.Mock).mockResolvedValue([]);
    (plantationService.getByOwner as jest.Mock).mockResolvedValue([]);
    (plantationService.create as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.update as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.delete as jest.Mock).mockResolvedValue({ message: 'deleted' });
    (plantationService.assignMandor as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.unassignMandor as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.transferMandor as jest.Mock).mockResolvedValue(undefined);
    (plantationService.getSupirs as jest.Mock).mockResolvedValue(['supir-1']);
    (plantationService.assignSupir as jest.Mock).mockResolvedValue({ id: 1 });
    (plantationService.unassignSupir as jest.Mock).mockResolvedValue({ id: 1 });
  });

  const openCreateForm = async () => {
    await screen.findByText(/Belum ada kebun yang cocok/i);
    fireEvent.click(screen.getByRole('button', { name: /^\+ Tambah Kebun$/i }));
  };

  const fillPlantationForm = () => {
    fireEvent.change(screen.getByPlaceholderText('Kebun Blok A'), { target: { value: 'Plantation A' } });
    fireEvent.change(screen.getByPlaceholderText('Kalimantan Selatan'), { target: { value: 'Riau' } });
    fireEvent.change(screen.getByPlaceholderText('25.5'), { target: { value: '15.5' } });
    fireEvent.change(screen.getByPlaceholderText('Deskripsi kebun...'), { target: { value: 'Sample plantation' } });
  };

  it('shows loading state and then empty state', async () => {
    let resolvePromise: ((value: unknown) => void) | undefined;
    (plantationService.getAll as jest.Mock).mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));

  it('shows the loading state while fetching', () => {
    let resolve: ((value: unknown) => void) | undefined;
    (plantationService.getAll as jest.Mock).mockReturnValue(
      new Promise((r) => { resolve = r; })
    );
    render(<PlantationsPage />);

    expect(screen.getByText(/Memuat/i)).toBeInTheDocument();
    resolvePromise?.([]);
    expect(await screen.findByText(/Belum ada kebun yang cocok/i)).toBeInTheDocument();
  });

  it('renders plantation cards and summary stats', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      samplePlantation,
      { id: 2, name: 'Plantation B', location: 'Jambi', area: 5, plantDate: 'not-a-date' },
      { id: 3, name: 'Plantation C', location: 'Aceh', area: 3 },
    ]);

    render(<PlantationsPage />);

    expect(await screen.findByText('Plantation A')).toBeInTheDocument();
    expect(screen.getByText('Kode P-001')).toBeInTheDocument();
    expect(screen.getByText(/2 orang/i)).toBeInTheDocument();
    expect(screen.getByText('not-a-date')).toBeInTheDocument();
    expect(screen.queryByText('ID 2')).not.toBeInTheDocument();
    expect(screen.getByText('Plantation C')).toBeInTheDocument();
  });

  it('shows load errors from Error and non-Error values', async () => {
    (plantationService.getAll as jest.Mock).mockRejectedValueOnce(new Error('Load failed'));
    const { unmount } = render(<PlantationsPage />);

    const error = await screen.findByText('Load failed');
    fireEvent.click(within(error.parentElement as HTMLElement).getByRole('button'));
    expect(screen.queryByText('Load failed')).not.toBeInTheDocument();
    unmount();

    (plantationService.getAll as jest.Mock).mockRejectedValueOnce('bad');
    render(<PlantationsPage />);
    expect(await screen.findByText('Gagal memuat plantasi')).toBeInTheDocument();
  });

  it('refreshes the plantation list', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/Belum ada kebun yang cocok/i);

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('opens the create form from the empty-state action', async () => {
    render(<PlantationsPage />);
    await screen.findByText(/Belum ada kebun yang cocok/i);

    fireEvent.click(screen.getByRole('button', { name: /^\+ Tambah Kebun Pertama$/i }));

    expect(screen.getByText('Tambah Kebun Baru')).toBeInTheDocument();
  });

  it('filters plantations by visible search text and resets the filter', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      samplePlantation,
      { id: 2, name: 'Plantation B', location: 'Jambi', area: 5 },
    ]);
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');

    fireEvent.change(screen.getByPlaceholderText('Cari nama atau lokasi kebun...'), { target: { value: 'Jambi' } });
    fireEvent.click(screen.getByRole('button', { name: /^Cari$/i }));

    expect(screen.queryByText('Plantation A')).not.toBeInTheDocument();
    expect(screen.getByText('Plantation B')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Reset$/i }));
    expect(screen.getByText('Plantation A')).toBeInTheDocument();
  });

  it('creates plantation with session owner id and default coordinates', async () => {
    render(<PlantationsPage />);
    await openCreateForm();
    fillPlantationForm();
    fireEvent.change(document.querySelector('input[type="datetime-local"]') as HTMLInputElement, {
      target: { value: '2026-01-15T08:30' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Buat Kebun/i }));

    await waitFor(() => {
      expect(plantationService.create).toHaveBeenCalledWith({
        name: 'Plantation A',
        location: 'Riau',
        area: 15.5,
        ownerId: '10',
        description: 'Sample plantation',
        plantDate: '2026-01-15T08:30',
        coordinates: [
          { latitude: -6.2, longitude: 106.816 },
          { latitude: -6.2, longitude: 106.826 },
          { latitude: -6.21, longitude: 106.826 },
          { latitude: -6.21, longitude: 106.816 },
        ],
      });
    });
    const success = await screen.findByText('Kebun berhasil dibuat!');
    fireEvent.click(within(success.parentElement as HTMLElement).getByRole('button'));
    expect(screen.queryByText('Kebun berhasil dibuat!')).not.toBeInTheDocument();
  });

  it('creates plantation with blank optional fields and resets via cancel', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue(null);
    render(<PlantationsPage />);
    await openCreateForm();

    fireEvent.change(screen.getByPlaceholderText('Kebun Blok A'), { target: { value: 'Plantation Blank' } });
    fireEvent.change(screen.getByPlaceholderText('Kalimantan Selatan'), { target: { value: 'Riau' } });
    fireEvent.change(screen.getByPlaceholderText('25.5'), { target: { value: '9' } });
    expect(screen.queryByPlaceholderText('UUID')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Batal/i }));
    expect(await screen.findByText(/Belum ada kebun yang cocok/i)).toBeInTheDocument();

    await openCreateForm();
    fireEvent.change(screen.getByPlaceholderText('Kebun Blok A'), { target: { value: 'Plantation Blank' } });
    fireEvent.change(screen.getByPlaceholderText('Kalimantan Selatan'), { target: { value: 'Riau' } });
    fireEvent.change(screen.getByPlaceholderText('25.5'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: /Buat Kebun/i }));

    await waitFor(() => {
      expect(plantationService.create).toHaveBeenCalledWith(expect.objectContaining({
        ownerId: undefined,
        description: undefined,
        plantDate: undefined,
      }));
    });
    // Form closes after success.
    expect(screen.queryByRole('heading', { level: 2, name: /add new plantation/i })).not.toBeInTheDocument();
    // Reloaded.
    await waitFor(() => {
      expect((plantationService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('rejects submission when coordinates are invalid', async () => {
    render(<PlantationsPage />);
    await openCreateForm();
    fillPlantationForm();
    fireEvent.change(screen.getAllByPlaceholderText('Lat')[0], { target: { value: '' } });
    fireEvent.submit(screen.getByRole('button', { name: /Buat Kebun/i }).closest('form') as HTMLFormElement);

    expect(await screen.findByText('Koordinat tidak valid')).toBeInTheDocument();
    expect(plantationService.create).not.toHaveBeenCalled();
  });

  it('shows create errors from Error and non-Error', async () => {
    (plantationService.create as jest.Mock).mockRejectedValueOnce(new Error('Create failed'));
    render(<PlantationsPage />);
    await openCreateForm();
    fillPlantationForm();
    fireEvent.click(screen.getByRole('button', { name: /Buat Kebun/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();

    (plantationService.create as jest.Mock).mockRejectedValueOnce('bad');
    fireEvent.click(screen.getByRole('button', { name: /Buat Kebun/i }));
    expect(await screen.findByText('Gagal simpan plantasi')).toBeInTheDocument();
  });

  it('edits an existing plantation and submits updated coordinates', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '1' } });

    fireEvent.click(await screen.findByRole('button', { name: /Edit/i }));
    fireEvent.change(screen.getAllByPlaceholderText('Lat')[0], { target: { value: '9.9' } });
    fireEvent.change(screen.getAllByPlaceholderText('Lon')[0], { target: { value: '8.8' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Kebun/i }));

    await waitFor(() => {
      expect(plantationService.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          name: 'Plantation A',
          coordinates: [
            { latitude: 9.9, longitude: 8.8 },
            { latitude: 3, longitude: 4 },
            { latitude: 5, longitude: 6 },
            { latitude: 7, longitude: 8 },
          ],
        })
      );
    });
  });

  it('edits plantation records with missing optional fields', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 4, name: 'Bare Plantation', location: 'Lampung', area: 8, plantDate: 'not-a-real-date', coordinates: [] },
    ]);
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Edit/i }));
    expect(screen.getByText('Edit: Bare Plantation')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('UUID')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Update Kebun/i }));

    await waitFor(() => {
      expect(plantationService.update).toHaveBeenCalledWith(
        '4',
        expect.objectContaining({
          ownerId: undefined,
          description: undefined,
          plantDate: undefined,
          coordinates: [
            { latitude: -6.2, longitude: 106.816 },
            { latitude: -6.2, longitude: 106.826 },
            { latitude: -6.21, longitude: 106.826 },
            { latitude: -6.21, longitude: 106.816 },
          ],
        })
      );
    });
  });

  it('edits plantation records without a plant date', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      { id: 5, name: 'No Date Plantation', location: 'Bengkulu', area: 6 },
    ]);
    render(<PlantationsPage />);
    await screen.findByText(/no plantations yet/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ add plantation/i }));
    fireEvent.change(screen.getByLabelText(/plantation name/i), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/area \(hectares\)/i), { target: { value: '1' } });

    fireEvent.click(await screen.findByRole('button', { name: /Edit/i }));

    expect(screen.getByText('Edit: No Date Plantation')).toBeInTheDocument();
    expect(document.querySelector('input[type="datetime-local"]')).toHaveValue('');
  });

  it('resets editing state and owner fallback when leaving the form tab', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Edit/i }));
    expect(screen.getByText('Edit: Plantation A')).toBeInTheDocument();

    (authService.getUserInfo as jest.Mock).mockReturnValue(null);
    fireEvent.click(screen.getByRole('button', { name: /Daftar Kebun/i }));
    fireEvent.click(screen.getByRole('button', { name: /^\+ Tambah Kebun$/i }));

    expect(screen.getByText('Tambah Kebun Baru')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('UUID')).not.toBeInTheDocument();
  });

  it('deletes and unassigns mandor from plantation cards', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Copot Mandor/i }));
    await waitFor(() => expect(plantationService.unassignMandor).toHaveBeenCalledWith(1));

    fireEvent.click(screen.getByRole('button', { name: /Hapus/i }));
    await waitFor(() => expect(plantationService.delete).toHaveBeenCalledWith(1));
  });

  it('does not delete when confirmation is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Hapus/i }));
    expect(plantationService.delete).not.toHaveBeenCalled();
  });

  it('shows delete and unassign-mandor errors', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    (plantationService.delete as jest.Mock).mockRejectedValueOnce(new Error('Delete failed'));
    (plantationService.unassignMandor as jest.Mock).mockRejectedValueOnce('bad');
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Hapus/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Copot Mandor/i }));
    expect(await screen.findByText('Gagal copot mandor')).toBeInTheDocument();
  });

  it('shows fallback delete and Error unassign-mandor messages', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    (plantationService.delete as jest.Mock).mockRejectedValueOnce('bad');
    (plantationService.unassignMandor as jest.Mock).mockRejectedValueOnce(new Error('Unassign mandor failed'));
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Hapus/i }));
    expect(await screen.findByText('Gagal hapus — pastikan tidak ada mandor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Copot Mandor/i }));
    expect(await screen.findByText('Unassign mandor failed')).toBeInTheDocument();
  });

  it('does not unassign mandor when confirmation is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Copot Mandor/i }));
    expect(plantationService.unassignMandor).not.toHaveBeenCalled();
  });

  it('handles mandor assignment and transfer forms', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      samplePlantation,
      { id: 2, name: 'Plantation B', location: 'Jambi', area: 5 },
    ]);
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Mandor/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const assignForm = screen.getByText(/Tugaskan Mandor ke Kebun/i).closest('div') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'mandor-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    await waitFor(() => expect(plantationService.assignMandor).toHaveBeenCalledWith('1', { mandorId: 'mandor-1' }));

    const transferForm = screen.getByRole('heading', { name: /Transfer Mandor/i }).closest('div.glass-card') as HTMLElement;
    const transferSelects = within(transferForm).getAllByRole('combobox');
    fireEvent.change(transferSelects[0], { target: { value: 'mandor-1' } });
    fireEvent.change(transferSelects[1], { target: { value: '1' } });
    fireEvent.change(transferSelects[2], { target: { value: '2' } });
    fireEvent.click(within(transferForm).getByRole('button', { name: /Pindahkan Mandor/i }));
    await waitFor(() => expect(plantationService.transferMandor).toHaveBeenCalledWith({
      mandorId: 'mandor-1',
      fromPlantationId: '1',
      toPlantationId: '2',
    }));
  });

  it('shows mandor assignment and transfer errors', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      samplePlantation,
      { id: 2, name: 'Plantation B', location: 'Jambi', area: 5 },
    ]);
    (plantationService.assignMandor as jest.Mock).mockRejectedValueOnce(new Error('Assign failed'));
    (plantationService.transferMandor as jest.Mock).mockRejectedValueOnce('bad');
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Mandor/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const assignForm = screen.getByText(/Tugaskan Mandor ke Kebun/i).closest('div') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'mandor-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    expect(await screen.findByText('Assign failed')).toBeInTheDocument();

    const transferForm = screen.getByRole('heading', { name: /Transfer Mandor/i }).closest('div.glass-card') as HTMLElement;
    const transferSelects = within(transferForm).getAllByRole('combobox');
    fireEvent.change(transferSelects[0], { target: { value: 'mandor-1' } });
    fireEvent.change(transferSelects[1], { target: { value: '1' } });
    fireEvent.change(transferSelects[2], { target: { value: '2' } });
    fireEvent.click(within(transferForm).getByRole('button', { name: /Pindahkan Mandor/i }));
    expect(await screen.findByText('Gagal transfer mandor')).toBeInTheDocument();
  });

  it('shows fallback assign and Error transfer messages', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      samplePlantation,
      { id: 2, name: 'Plantation B', location: 'Jambi', area: 5 },
    ]);
    (plantationService.assignMandor as jest.Mock).mockRejectedValueOnce('bad');
    (plantationService.transferMandor as jest.Mock).mockRejectedValueOnce(new Error('Transfer failed'));
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Mandor/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const assignForm = screen.getByText(/Tugaskan Mandor ke Kebun/i).closest('div') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'mandor-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    expect(await screen.findByText('Gagal assign mandor')).toBeInTheDocument();

    const transferForm = screen.getByRole('heading', { name: /Transfer Mandor/i }).closest('div.glass-card') as HTMLElement;
    const transferSelects = within(transferForm).getAllByRole('combobox');
    fireEvent.change(transferSelects[0], { target: { value: 'mandor-1' } });
    fireEvent.change(transferSelects[1], { target: { value: '1' } });
    fireEvent.change(transferSelects[2], { target: { value: '2' } });
    fireEvent.click(within(transferForm).getByRole('button', { name: /Pindahkan Mandor/i }));
    expect(await screen.findByText('Transfer failed')).toBeInTheDocument();
  });

  it('handles supir view, assignment, and unassignment flows', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Supir/i }));

    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const viewForm = screen.getByText(/Lihat Supir di Kebun/i).closest('div') as HTMLElement;
    fireEvent.change(within(viewForm).getByRole('combobox'), { target: { value: '1' } });
    fireEvent.click(within(viewForm).getByRole('button', { name: /Lihat/i }));
    expect(await screen.findByText('driver')).toBeInTheDocument();
    fireEvent.click(within(viewForm).getByRole('button', { name: /^Copot$/i }));

    const assignForm = screen.getByText(/Tugaskan Supir ke Kebun/i).closest('div') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    await waitFor(() => expect(plantationService.assignSupir).toHaveBeenCalledWith('1', 'supir-1'));

    const unassignForm = screen.getByText(/Copot Supir dari Kebun/i).closest('div') as HTMLElement;
    const unassignSelects = within(unassignForm).getAllByRole('combobox');
    fireEvent.change(unassignSelects[0], { target: { value: '1' } });
    fireEvent.change(unassignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(unassignForm).getByRole('button', { name: /Copot Supir/i }));
    await waitFor(() => expect(plantationService.unassignSupir).toHaveBeenCalledWith('1', 'supir-1'));
  });

  it('handles supir error flows', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    (plantationService.getSupirs as jest.Mock).mockRejectedValueOnce(new Error('Supir load failed'));
    (plantationService.assignSupir as jest.Mock).mockRejectedValueOnce('bad');
    (plantationService.unassignSupir as jest.Mock).mockRejectedValueOnce(new Error('Unassign supir failed'));
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Supir/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const viewForm = screen.getByText(/Lihat Supir di Kebun/i).closest('div') as HTMLElement;
    fireEvent.change(within(viewForm).getByRole('combobox'), { target: { value: '1' } });
    fireEvent.click(within(viewForm).getByRole('button', { name: /Lihat/i }));
    expect(await screen.findByText('Supir load failed')).toBeInTheDocument();

    const assignForm = screen.getByText(/Tugaskan Supir ke Kebun/i).closest('div') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    expect(await screen.findByText('Gagal assign supir')).toBeInTheDocument();

    const unassignForm = screen.getByText(/Copot Supir dari Kebun/i).closest('div') as HTMLElement;
    const unassignSelects = within(unassignForm).getAllByRole('combobox');
    fireEvent.change(unassignSelects[0], { target: { value: '1' } });
    fireEvent.change(unassignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(unassignForm).getByRole('button', { name: /Copot Supir/i }));
    expect(await screen.findByText('Unassign supir failed')).toBeInTheDocument();
  });

  it('shows alternate supir fallback error branches', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    (plantationService.getSupirs as jest.Mock).mockRejectedValueOnce('bad');
    (plantationService.assignSupir as jest.Mock).mockRejectedValueOnce(new Error('Assign supir failed'));
    (plantationService.unassignSupir as jest.Mock).mockRejectedValueOnce('bad');
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Supir/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const viewForm = screen.getByText(/Lihat Supir di Kebun/i).closest('div') as HTMLElement;
    fireEvent.change(within(viewForm).getByRole('combobox'), { target: { value: '1' } });
    fireEvent.click(within(viewForm).getByRole('button', { name: /Lihat/i }));
    expect(await screen.findByText('Gagal ambil daftar supir')).toBeInTheDocument();

    const assignForm = screen.getByText(/Tugaskan Supir ke Kebun/i).closest('div') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    expect(await screen.findByText('Assign supir failed')).toBeInTheDocument();

    const unassignForm = screen.getByText(/Copot Supir dari Kebun/i).closest('div') as HTMLElement;
    const unassignSelects = within(unassignForm).getAllByRole('combobox');
    fireEvent.change(unassignSelects[0], { target: { value: '1' } });
    fireEvent.change(unassignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(unassignForm).getByRole('button', { name: /Copot Supir/i }));
    expect(await screen.findByText('Gagal copot supir')).toBeInTheDocument();
  });

  it('does not unassign supir when confirmation is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);
    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Supir/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const unassignForm = screen.getByText(/Copot Supir dari Kebun/i).closest('div') as HTMLElement;
    const unassignSelects = within(unassignForm).getAllByRole('combobox');
    fireEvent.change(unassignSelects[0], { target: { value: '1' } });
    fireEvent.change(unassignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(unassignForm).getByRole('button', { name: /Copot Supir/i }));

    expect(plantationService.unassignSupir).not.toHaveBeenCalled();
  });
});
