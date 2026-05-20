import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HarvestsPage from './page';
import { harvestService } from '@/services/harvest.service';

jest.mock('@/services/harvest.service', () => ({
  harvestService: {
    getAll: jest.fn(),
    getMine: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

type MockUser = { id: string; role: string } | null;
let mockAuth: { user: MockUser } = { user: { id: 'mandor-1', role: 'MANDOR' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

const asMandor = () => {
  mockAuth = { user: { id: 'mandor-1', role: 'MANDOR' } };
};

const asBuruh = () => {
  mockAuth = { user: { id: 'buruh-1', role: 'BURUH' } };
};

const asNoRole = () => {
  mockAuth = { user: null };
};

const makeHarvest = (overrides: Record<string, unknown> = {}) => ({
  id: 'harvest-1',
  plantationId: 'plant-1',
  weight: 100,
  status: 'PENDING',
  harvestDate: '2026-01-01T08:00:00Z',
  ...overrides,
});

const fillCreateForm = (
  overrides: Partial<{ plantationId: string; weight: string; news: string; files: File[] }> = {},
) => {
  fireEvent.click(screen.getByRole('button', { name: /\+ Catat Panen/i }));
  fireEvent.change(screen.getByPlaceholderText('Kebun'), {
    target: { value: overrides.plantationId ?? 'plant-uuid' },
  });
  fireEvent.change(screen.getByPlaceholderText('Berat panen (kg)'), {
    target: { value: overrides.weight ?? '120.5' },
  });
  fireEvent.change(screen.getByPlaceholderText('Keterangan panen'), {
    target: { value: overrides.news ?? 'morning batch' },
  });
  fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: overrides.files ?? [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
};

const submitCreateForm = () => {
  const panel = screen.getByText('Catat Panen').closest('div.bg-white') as HTMLElement;
  fireEvent.submit(panel.querySelector('form') as HTMLFormElement);
};

describe('HarvestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMandor();
    (harvestService.getAll as jest.Mock).mockResolvedValue([]);
    (harvestService.getMine as jest.Mock).mockResolvedValue([]);
    (harvestService.create as jest.Mock).mockResolvedValue({ id: 'harvest-new' });
    (harvestService.updateStatus as jest.Mock).mockResolvedValue({ id: 'harvest-1' });
  });

  it('does not fetch harvest data when no harvest role is available', async () => {
    asNoRole();

    render(<HarvestsPage />);

    expect(await screen.findByText(/Belum ada catatan panen/i)).toBeInTheDocument();
    expect(harvestService.getAll).not.toHaveBeenCalled();
    expect(harvestService.getMine).not.toHaveBeenCalled();
  });

  it('loads mandor harvests through getAll and renders the empty state', async () => {
    render(<HarvestsPage />);

    await waitFor(() => {
      expect(harvestService.getAll).toHaveBeenCalledWith({
        harvesterName: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });
    expect(screen.getByText(/Pencatatan Panen/i)).toBeInTheDocument();
    expect(screen.getByText(/Filter Catatan Panen/i)).toBeInTheDocument();
    expect(screen.getByText(/Ubah Status Panen/i)).toBeInTheDocument();
    expect(await screen.findByText(/Belum ada catatan panen/i)).toBeInTheDocument();
  });

  it('renders harvest cards, stats, optional fields, and pagination', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue(
      Array.from({ length: 11 }, (_, index) =>
        makeHarvest({
          id: `harvest-${index + 1}`,
          plantationId: `plant-${index + 1}`,
          weight: index + 1,
          status: index === 0 ? 'APPROVED' : index === 1 ? 'REJECTED' : 'PENDING',
          harvesterName: index === 0 ? 'Budi' : undefined,
          harvesterId: index === 1 ? 'harvester-2' : undefined,
          foremanId: index === 0 ? 'mandor-1' : undefined,
          news: index === 0 ? 'fresh batch' : undefined,
          rejectionReason: index === 1 ? 'too wet' : undefined,
          photos: index === 0 ? ['a.jpg', 'b.jpg'] : undefined,
        }),
      ),
    );

    render(<HarvestsPage />);

    const firstCard = (await screen.findByText('Budi')).closest('div.bg-white') as HTMLElement;
    expect(within(firstCard).getByText('Disetujui')).toBeInTheDocument();
    expect(within(firstCard).getByText('Sudah diverifikasi')).toBeInTheDocument();
    expect(within(firstCard).getByText('fresh batch')).toBeInTheDocument();
    expect(within(firstCard).getByText(/2 terlampir/i)).toBeInTheDocument();
    expect(screen.getByText('Total Catatan').parentElement).toHaveTextContent('11');
    expect(screen.getAllByText('Disetujui')[0].parentElement).toHaveTextContent('1');
    expect(screen.getByText('Menunggu / Ditolak').parentElement).toHaveTextContent('9 / 1');
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent('Menampilkan 1 sampai 10 dari 11 catatan');

    fireEvent.click(screen.getByRole('button', { name: /Berikutnya/i }));
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent('Menampilkan 11 sampai 11 dari 11 catatan');
  });

  it('applies mandor filters through getAll', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fireEvent.change(screen.getByPlaceholderText('Nama pekerja'), { target: { value: 'Andi' } });
    const [startDate, endDate] = screen
      .getAllByDisplayValue('')
      .filter((el) => (el as HTMLInputElement).type === 'datetime-local') as HTMLInputElement[];
    fireEvent.change(startDate, { target: { value: '2026-01-01T00:00' } });
    fireEvent.change(endDate, { target: { value: '2026-01-31T23:59' } });
    fireEvent.click(screen.getByRole('button', { name: /Terapkan Filter/i }));

    await waitFor(() => {
      expect(harvestService.getAll).toHaveBeenLastCalledWith({
        harvesterName: 'Andi',
        startDate: '2026-01-01T00:00',
        endDate: '2026-01-31T23:59',
      });
    });
  });

  it('loads buruh harvests through getMine with status filters', async () => {
    asBuruh();
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    const [statusFilter] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(statusFilter, { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByRole('button', { name: /Terapkan Filter/i }));

    await waitFor(() => {
      expect(harvestService.getMine).toHaveBeenLastCalledWith({
        startDate: undefined,
        endDate: undefined,
        status: 'APPROVED',
      });
    });
    expect(harvestService.getAll).not.toHaveBeenCalled();
  });

  it('creates a harvest with attached files and reloads', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fillCreateForm({ plantationId: 'plant-uuid', weight: '42.5', news: 'good day' });
    submitCreateForm();

    await waitFor(() => {
      expect(harvestService.create).toHaveBeenCalledWith({
        plantationId: 'plant-uuid',
        weight: 42.5,
        news: 'good day',
        files: expect.any(Array),
      });
    });
    await waitFor(() => expect((harvestService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(screen.getByRole('button', { name: /\+ Catat Panen/i })).toBeInTheDocument();
  });

  it('requires at least one harvest photo before creating', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fillCreateForm({ files: [] });
    submitCreateForm();

    expect(await screen.findByText('Minimal 1 foto hasil panen harus dilampirkan')).toBeInTheDocument();
    expect(harvestService.create).not.toHaveBeenCalled();
  });

  it('updates rejected harvest status with a reason', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fireEvent.change(screen.getByPlaceholderText('Nomor catatan panen'), { target: { value: 'harvest-1' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
    fireEvent.change(screen.getByPlaceholderText('Alasan penolakan'), { target: { value: 'too wet' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));

    await waitFor(() => {
      expect(harvestService.updateStatus).toHaveBeenCalledWith({
        id: 'harvest-1',
        status: 'REJECTED',
        rejectionReason: 'too wet',
      });
    });
  });

  it('shows fallback errors from service failures', async () => {
    (harvestService.getAll as jest.Mock).mockRejectedValueOnce('bad');
    render(<HarvestsPage />);

    expect(await screen.findByText('Gagal memuat catatan panen')).toBeInTheDocument();

    (harvestService.updateStatus as jest.Mock).mockRejectedValueOnce('bad');
    fireEvent.change(screen.getByPlaceholderText('Nomor catatan panen'), { target: { value: 'harvest-err' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));
    expect(await screen.findByText('Gagal memperbarui status panen')).toBeInTheDocument();
  });
});
