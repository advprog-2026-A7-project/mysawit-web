import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PlantationsPage from './page';
import { plantationService } from '@/services/plantation.service';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';

const confirmMock = jest.fn();

jest.mock('@/services/plantation.service', () => ({
  plantationService: {
    getAll: jest.fn(),
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
  mandorId: 'mandor-1',
  supirIds: ['supir-1'],
  plantDate: '2026-01-15T10:00:00Z',
  coordinates: [
    { latitude: 1, longitude: 2 },
    { latitude: 3, longitude: 4 },
    { latitude: 5, longitude: 6 },
    { latitude: 7, longitude: 8 },
  ],
};

const openCreateForm = async () => {
  await screen.findByText(/Belum ada kebun yang cocok/i);
  fireEvent.click(screen.getByRole('button', { name: /^\+ Tambah Kebun Pertama$/i }));
};

const fillPlantationForm = () => {
  fireEvent.change(screen.getByPlaceholderText('Kebun Blok A'), { target: { value: 'Plantation A' } });
  fireEvent.change(screen.getByPlaceholderText('Kalimantan Selatan'), { target: { value: 'Riau' } });
  fireEvent.change(screen.getByPlaceholderText('25.5'), { target: { value: '15.5' } });
  fireEvent.change(screen.getByPlaceholderText('Deskripsi kebun...'), { target: { value: 'Sample plantation' } });
};

describe('PlantationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    confirmMock.mockReturnValue(true);
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: '10' });
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      { id: 'supir-1', username: 'driver', email: 'driver@mail.com', role: 'SUPIR' },
      { id: 'mandor-1', username: 'foreman', email: 'foreman@mail.com', role: 'MANDOR' },
    ]);
    (plantationService.getAll as jest.Mock).mockResolvedValue([]);
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

  it('shows loading state and then empty state', async () => {
    let resolvePromise: ((value: unknown) => void) | undefined;
    (plantationService.getAll as jest.Mock).mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; }),
    );

    render(<PlantationsPage />);

    expect(screen.getByText(/Memuat/i)).toBeInTheDocument();
    resolvePromise?.([]);
    expect(await screen.findByText(/Belum ada kebun yang cocok/i)).toBeInTheDocument();
  });

  it('renders plantation cards, stats, filters, and reset', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      samplePlantation,
      { id: 2, name: 'Plantation B', location: 'Jambi', area: 5, supirIds: [] },
    ]);

    render(<PlantationsPage />);

    expect(await screen.findByText('Plantation A')).toBeInTheDocument();
    expect(screen.getByText('Kode P-001')).toBeInTheDocument();
    expect(screen.getByText(/1 orang/i)).toBeInTheDocument();
    expect(screen.getByText('Total Kebun').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Luas Total').parentElement).toHaveTextContent('15 ha');

    fireEvent.change(screen.getByPlaceholderText('Cari nama atau lokasi kebun...'), { target: { value: 'Jambi' } });
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
    expect(await screen.findByText('Kebun berhasil dibuat!')).toBeInTheDocument();
  });

  it('edits an existing plantation and submits updated coordinates', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);

    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Edit/i }));
    expect(screen.getByText('Edit: Plantation A')).toBeInTheDocument();
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
        }),
      );
    });
  });

  it('handles delete and unassign mandor actions from cards', async () => {
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

  it('handles mandor assignment and transfer forms', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      samplePlantation,
      { id: 2, name: 'Plantation B', location: 'Jambi', area: 5 },
    ]);

    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Mandor/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const assignForm = screen.getByText(/Assign Mandor ke Kebun/i).closest('div.glass-card') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'mandor-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    await waitFor(() => expect(plantationService.assignMandor).toHaveBeenCalledWith('1', { mandorId: 'mandor-1' }));

    const transferForm = screen.getByText(/Transfer Mandor/i).closest('div.glass-card') as HTMLElement;
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

  it('handles supir view, assignment, and unassignment forms', async () => {
    (plantationService.getAll as jest.Mock).mockResolvedValue([samplePlantation]);

    render(<PlantationsPage />);
    await screen.findByText('Plantation A');
    fireEvent.click(screen.getByRole('button', { name: /Penugasan Supir/i }));
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());

    const viewForm = screen.getByText(/Lihat Supir di Kebun/i).closest('div.glass-card') as HTMLElement;
    fireEvent.change(within(viewForm).getByRole('combobox'), { target: { value: '1' } });
    fireEvent.click(within(viewForm).getByRole('button', { name: /Lihat/i }));
    expect(await screen.findByText('driver')).toBeInTheDocument();

    const assignForm = screen.getByText(/Assign Supir ke Kebun/i).closest('div.glass-card') as HTMLElement;
    const assignSelects = within(assignForm).getAllByRole('combobox');
    fireEvent.change(assignSelects[0], { target: { value: '1' } });
    fireEvent.change(assignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(assignForm).getByRole('button', { name: /Simpan Penugasan/i }));
    await waitFor(() => expect(plantationService.assignSupir).toHaveBeenCalledWith('1', 'supir-1'));

    const unassignForm = screen.getByText(/Copot Supir dari Kebun/i).closest('div.glass-card') as HTMLElement;
    const unassignSelects = within(unassignForm).getAllByRole('combobox');
    fireEvent.change(unassignSelects[0], { target: { value: '1' } });
    fireEvent.change(unassignSelects[1], { target: { value: 'supir-1' } });
    fireEvent.click(within(unassignForm).getByRole('button', { name: /Copot Supir/i }));
    await waitFor(() => expect(plantationService.unassignSupir).toHaveBeenCalledWith('1', 'supir-1'));
  });

  it('shows fallback service errors', async () => {
    (plantationService.getAll as jest.Mock).mockRejectedValueOnce('bad');

    render(<PlantationsPage />);

    expect(await screen.findByText('Gagal memuat plantasi')).toBeInTheDocument();
  });
});
