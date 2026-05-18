import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ShipmentsPage from './page';
import { shipmentService } from '@/services/shipment.service';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();
const routerMock = { push: pushMock };

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/shipment.service', () => ({
  shipmentService: {
    getAll: jest.fn(),
    getByStatus: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    approveByAdmin: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
  },
}));

const openCreateForm = () => {
  fireEvent.click(screen.getByRole('button', { name: /\+ Buat Pengiriman/i }));
};

const fillCreateForm = (
  overrides: Partial<{ supirUserId: string; destination: string; items: string }> = {}
) => {
  fireEvent.change(screen.getByPlaceholderText('Supir'), {
    target: { value: overrides.supirUserId ?? 'supir-uuid' },
  });
  fireEvent.change(screen.getByPlaceholderText('Tujuan pabrik'), {
    target: { value: overrides.destination ?? 'Jakarta' },
  });
  fireEvent.change(screen.getByPlaceholderText('Catatan panen dan berat, satu baris per muatan'), {
    target: { value: overrides.items ?? 'harvest-1, 100\nharvest-2, 50.5' },
  });
};

describe('ShipmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (shipmentService.getAll as jest.Mock).mockResolvedValue([]);
    (shipmentService.getByStatus as jest.Mock).mockResolvedValue([]);
    (shipmentService.create as jest.Mock).mockResolvedValue({ id: 's-1' });
    (shipmentService.updateStatus as jest.Mock).mockResolvedValue({ id: 's-1' });
    (shipmentService.approveByAdmin as jest.Mock).mockResolvedValue({ id: 's-1' });
  });

  it('redirects to login when user is not authenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
    render(<ShipmentsPage />);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(shipmentService.getAll).not.toHaveBeenCalled();
  });

  it('shows loading state then empty state', async () => {
    let resolvePromise: ((value: unknown) => void) | undefined;
    (shipmentService.getAll as jest.Mock).mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    render(<ShipmentsPage />);
    expect(screen.getByText(/Memuat pengiriman/i)).toBeInTheDocument();
    resolvePromise?.([]);
    expect(await screen.findByText(/Belum ada pengiriman/i)).toBeInTheDocument();
  });

  it('renders shipments list with items and stat totals', async () => {
    (shipmentService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 'abcd1234-uuid',
        destination: 'Jakarta',
        mandorUserId: 'mandor-1',
        supirUserId: 'supir-1',
        totalKg: 200,
        status: 'MEMUAT',
        createdAt: '2026-01-01T08:00:00Z',
        items: [
          { harvestId: 'h-1', weightKg: 120 },
          { harvestId: 'h-2', weightKg: 80 },
        ],
      },
      {
        id: 'efgh5678-uuid',
        destination: 'Surabaya',
        weight: 150,
        status: 'TIBA',
        createdAt: 'invalid-date',
      },
    ]);

    render(<ShipmentsPage />);

    const destination = await screen.findByText('Jakarta');
    const card = destination.closest('div.bg-white') as HTMLElement;
    expect(within(card).getByText('Memuat')).toBeInTheDocument();
    expect(within(card).getByText('Jakarta')).toBeInTheDocument();
    expect(within(card).getByText('Sudah diverifikasi')).toBeInTheDocument();
    expect(within(card).getByText('Sudah ditugaskan')).toBeInTheDocument();
    expect(within(card).getByText('120 kg')).toBeInTheDocument();

    const arrivedCard = screen.getByText('Surabaya').closest('div.bg-white') as HTMLElement;
    expect(within(arrivedCard).getByText('invalid-date')).toBeInTheDocument();
    expect(within(arrivedCard).getAllByText('-').length).toBeGreaterThan(0);

    // Stats card aggregates
    const totalWeightCard = screen.getByText('Berat Total').parentElement!;
    expect(within(totalWeightCard).getByText(/350/)).toBeInTheDocument();
    const activeCard = screen.getByText('Berjalan').parentElement!;
    expect(within(activeCard).getByText('1')).toBeInTheDocument();
    const arrivedCardStat = screen.getByText('Tiba').parentElement!;
    expect(within(arrivedCardStat).getByText('1')).toBeInTheDocument();
  });

  it('renders dash for missing createdAt date', async () => {
    (shipmentService.getAll as jest.Mock).mockResolvedValue([
      { id: 's-1', destination: 'X', status: 'MEMUAT', createdAt: '', updatedAt: '' },
    ]);
    render(<ShipmentsPage />);
    const card = (await screen.findByText('X')).closest('div.bg-white') as HTMLElement;
    expect(within(card).getAllByText('-').length).toBeGreaterThan(0);
  });

  it('shows load error from Error', async () => {
    (shipmentService.getAll as jest.Mock).mockRejectedValue(new Error('Load failed'));
    render(<ShipmentsPage />);
    expect(await screen.findByText('Load failed')).toBeInTheDocument();
  });

  it('shows fallback load error when thrown value is not Error', async () => {
    (shipmentService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    expect(await screen.findByText('Gagal memuat pengiriman')).toBeInTheDocument();
  });

  it('filters by status via Terapkan Filter, and resets via Reset', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);

    const filterSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(filterSelect, { target: { value: 'MEMUAT' } });
    fireEvent.click(screen.getByRole('button', { name: /Terapkan Filter/i }));

    await waitFor(() => expect(shipmentService.getByStatus).toHaveBeenCalledWith('MEMUAT'));

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    await waitFor(() => {
      // getAll called initial + on reset
      expect((shipmentService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('toggles create shipment form visibility', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);
    openCreateForm();
    expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Batal/i }));
    expect(screen.getByRole('button', { name: /\+ Buat Pengiriman/i })).toBeInTheDocument();
  });

  it('creates a shipment with parsed items and reloads using current filter', async () => {
    (shipmentService.getByStatus as jest.Mock).mockResolvedValue([]);
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);

    // Terapkan Filter first so loadShipments uses the filter when reloading after create
    const filterSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(filterSelect, { target: { value: 'MEMUAT' } });
    fireEvent.click(screen.getByRole('button', { name: /Terapkan Filter/i }));
    await waitFor(() => expect(shipmentService.getByStatus).toHaveBeenCalledWith('MEMUAT'));

    openCreateForm();
    fillCreateForm({
      supirUserId: 'supir-abc',
      destination: 'Bandung',
      items: 'h-1, 100\nh-2, 50.5\nbad-line\n,99\nh-3,not-a-number',
    });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Pengiriman/i }));

    await waitFor(() => {
      expect(shipmentService.create).toHaveBeenCalledWith({
        supirUserId: 'supir-abc',
        destination: 'Bandung',
        items: [
          { harvestId: 'h-1', weightKg: 100 },
          { harvestId: 'h-2', weightKg: 50.5 },
        ],
        weight: 150.5,
      });
    });
    await waitFor(() => {
      expect((shipmentService.getByStatus as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByRole('button', { name: /\+ Buat Pengiriman/i })).toBeInTheDocument();
  });

  it('shows create error from Error', async () => {
    (shipmentService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);
    openCreateForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /Simpan Pengiriman/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (shipmentService.create as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);
    openCreateForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /Simpan Pengiriman/i }));
    expect(await screen.findByText('Gagal membuat pengiriman')).toBeInTheDocument();
  });

  it('updates driver status', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);

    const allInputs = screen.getAllByPlaceholderText('Nomor pengiriman');
    fireEvent.change(allInputs[0], { target: { value: 'ship-1' } });
    const driverStatus = screen.getAllByRole('combobox')[1];
    fireEvent.change(driverStatus, { target: { value: 'TIBA' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));

    await waitFor(() => {
      expect(shipmentService.updateStatus).toHaveBeenCalledWith('ship-1', { status: 'TIBA' });
    });
  });

  it('shows driver status error from Error', async () => {
    (shipmentService.updateStatus as jest.Mock).mockRejectedValue(new Error('Status failed'));
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);
    fireEvent.change(screen.getAllByPlaceholderText('Nomor pengiriman')[0], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));
    expect(await screen.findByText('Status failed')).toBeInTheDocument();
  });

  it('shows fallback driver status error when thrown value is not Error', async () => {
    (shipmentService.updateStatus as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);
    fireEvent.change(screen.getAllByPlaceholderText('Nomor pengiriman')[0], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));
    expect(await screen.findByText('Gagal memperbarui pengiriman')).toBeInTheDocument();
  });

  it('submits admin approval', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);

    const adminInput = screen.getAllByPlaceholderText('Nomor pengiriman')[1];
    fireEvent.change(adminInput, { target: { value: 'ship-9' } });
    const adminStatus = screen.getAllByRole('combobox')[2];
    fireEvent.change(adminStatus, { target: { value: 'PARTIALLY_REJECTED' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Persetujuan/i }));

    await waitFor(() => {
      expect(shipmentService.approveByAdmin).toHaveBeenCalledWith('ship-9', 'PARTIALLY_REJECTED');
    });
  });

  it('shows admin approval error from Error', async () => {
    (shipmentService.approveByAdmin as jest.Mock).mockRejectedValue(new Error('Admin failed'));
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);
    fireEvent.change(screen.getAllByPlaceholderText('Nomor pengiriman')[1], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Persetujuan/i }));
    expect(await screen.findByText('Admin failed')).toBeInTheDocument();
  });

  it('shows fallback admin approval error when thrown value is not Error', async () => {
    (shipmentService.approveByAdmin as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    await screen.findByText(/Belum ada pengiriman/i);
    fireEvent.change(screen.getAllByPlaceholderText('Nomor pengiriman')[1], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Persetujuan/i }));
    expect(await screen.findByText('Gagal menyimpan persetujuan')).toBeInTheDocument();
  });
});
