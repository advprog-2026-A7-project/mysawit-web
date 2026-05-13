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
  fireEvent.click(screen.getByRole('button', { name: /\+ create shipment/i }));
};

const fillCreateForm = (
  overrides: Partial<{ supirUserId: string; destination: string; items: string }> = {}
) => {
  fireEvent.change(screen.getByPlaceholderText('Supir UUID'), {
    target: { value: overrides.supirUserId ?? 'supir-uuid' },
  });
  fireEvent.change(screen.getByPlaceholderText('Destination'), {
    target: { value: overrides.destination ?? 'Jakarta' },
  });
  fireEvent.change(screen.getByPlaceholderText('Harvest UUID, weight kg per line'), {
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
    expect(screen.getByText(/loading shipments/i)).toBeInTheDocument();
    resolvePromise?.([]);
    expect(await screen.findByText(/no shipment data/i)).toBeInTheDocument();
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

    const heading = await screen.findByText(/Shipment #abcd1234/);
    const card = heading.closest('div.bg-white') as HTMLElement;
    expect(within(card).getByText('MEMUAT')).toBeInTheDocument();
    expect(within(card).getByText('Jakarta')).toBeInTheDocument();
    expect(within(card).getByText('mandor-1')).toBeInTheDocument();
    expect(within(card).getByText('supir-1')).toBeInTheDocument();
    expect(within(card).getByText('h-1: 120 kg')).toBeInTheDocument();

    const arrivedHeading = screen.getByText(/Shipment #efgh5678/);
    const arrivedCard = arrivedHeading.closest('div.bg-white') as HTMLElement;
    expect(within(arrivedCard).getByText('invalid-date')).toBeInTheDocument();
    expect(within(arrivedCard).getAllByText('-').length).toBeGreaterThan(0);

    // Stats card aggregates
    const totalWeightCard = screen.getByText('Total Weight').parentElement!;
    expect(within(totalWeightCard).getByText(/350/)).toBeInTheDocument();
    const activeCard = screen.getByText('Active').parentElement!;
    expect(within(activeCard).getByText('1')).toBeInTheDocument();
    const arrivedCardStat = screen.getByText('Arrived').parentElement!;
    expect(within(arrivedCardStat).getByText('1')).toBeInTheDocument();
  });

  it('renders dash for missing createdAt date', async () => {
    (shipmentService.getAll as jest.Mock).mockResolvedValue([
      { id: 's-1', destination: 'X', status: 'MEMUAT', createdAt: '', updatedAt: '' },
    ]);
    render(<ShipmentsPage />);
    const heading = await screen.findByText(/Shipment #s-1/);
    const card = heading.closest('div.bg-white') as HTMLElement;
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
    expect(await screen.findByText('Failed to load shipments')).toBeInTheDocument();
  });

  it('filters by status via Apply Filter, and resets via Reset', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);

    const filterSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(filterSelect, { target: { value: 'MEMUAT' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));

    await waitFor(() => expect(shipmentService.getByStatus).toHaveBeenCalledWith('MEMUAT'));

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    await waitFor(() => {
      // getAll called initial + on reset
      expect((shipmentService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('toggles create shipment form visibility', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);
    openCreateForm();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /\+ create shipment/i })).toBeInTheDocument();
  });

  it('creates a shipment with parsed items and reloads using current filter', async () => {
    (shipmentService.getByStatus as jest.Mock).mockResolvedValue([]);
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);

    // Apply filter first so loadShipments uses the filter when reloading after create
    const filterSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(filterSelect, { target: { value: 'MEMUAT' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));
    await waitFor(() => expect(shipmentService.getByStatus).toHaveBeenCalledWith('MEMUAT'));

    openCreateForm();
    fillCreateForm({
      supirUserId: 'supir-abc',
      destination: 'Bandung',
      items: 'h-1, 100\nh-2, 50.5\nbad-line\n,99\nh-3,not-a-number',
    });
    fireEvent.click(screen.getByRole('button', { name: /save shipment/i }));

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
    expect(screen.getByRole('button', { name: /\+ create shipment/i })).toBeInTheDocument();
  });

  it('shows create error from Error', async () => {
    (shipmentService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);
    openCreateForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /save shipment/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (shipmentService.create as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);
    openCreateForm();
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /save shipment/i }));
    expect(await screen.findByText('Failed to create shipment')).toBeInTheDocument();
  });

  it('updates driver status', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);

    const allInputs = screen.getAllByPlaceholderText('Shipment UUID');
    fireEvent.change(allInputs[0], { target: { value: 'ship-1' } });
    const driverStatus = screen.getAllByRole('combobox')[1];
    fireEvent.change(driverStatus, { target: { value: 'TIBA' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));

    await waitFor(() => {
      expect(shipmentService.updateStatus).toHaveBeenCalledWith('ship-1', { status: 'TIBA' });
    });
  });

  it('shows driver status error from Error', async () => {
    (shipmentService.updateStatus as jest.Mock).mockRejectedValue(new Error('Status failed'));
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);
    fireEvent.change(screen.getAllByPlaceholderText('Shipment UUID')[0], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));
    expect(await screen.findByText('Status failed')).toBeInTheDocument();
  });

  it('shows fallback driver status error when thrown value is not Error', async () => {
    (shipmentService.updateStatus as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);
    fireEvent.change(screen.getAllByPlaceholderText('Shipment UUID')[0], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));
    expect(await screen.findByText('Failed to update shipment status')).toBeInTheDocument();
  });

  it('submits admin approval', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);

    const adminInput = screen.getAllByPlaceholderText('Shipment UUID')[1];
    fireEvent.change(adminInput, { target: { value: 'ship-9' } });
    const adminStatus = screen.getAllByRole('combobox')[2];
    fireEvent.change(adminStatus, { target: { value: 'PARTIALLY_REJECTED' } });
    fireEvent.click(screen.getByRole('button', { name: /submit approval/i }));

    await waitFor(() => {
      expect(shipmentService.approveByAdmin).toHaveBeenCalledWith('ship-9', 'PARTIALLY_REJECTED');
    });
  });

  it('shows admin approval error from Error', async () => {
    (shipmentService.approveByAdmin as jest.Mock).mockRejectedValue(new Error('Admin failed'));
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);
    fireEvent.change(screen.getAllByPlaceholderText('Shipment UUID')[1], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /submit approval/i }));
    expect(await screen.findByText('Admin failed')).toBeInTheDocument();
  });

  it('shows fallback admin approval error when thrown value is not Error', async () => {
    (shipmentService.approveByAdmin as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    await screen.findByText(/no shipment data/i);
    fireEvent.change(screen.getAllByPlaceholderText('Shipment UUID')[1], { target: { value: 's-x' } });
    fireEvent.click(screen.getByRole('button', { name: /submit approval/i }));
    expect(await screen.findByText('Failed to submit admin approval')).toBeInTheDocument();
  });
});
