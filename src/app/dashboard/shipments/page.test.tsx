import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ShipmentsPage from './page';
import { shipmentService } from '@/services/shipment.service';
import { authService } from '@/services/auth.service';
import type { Shipment } from '@/types';

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

jest.mock('@/services/shipment.service', () => ({
  shipmentService: {
    getAll: jest.fn(),
    getByStatus: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
  },
}));

const makeShipment = (overrides: Partial<Shipment> = {}): Shipment => ({
  id: 1,
  harvestId: 2,
  destination: 'Jakarta',
  weight: 500,
  status: 'PENDING',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
});

const fillForm = (container: HTMLElement, overrides: Partial<{ shipperName: string; vehicleNumber: string; shipmentDate: string; notes: string }> = {}) => {
  const addShipmentButton = screen.queryByRole('button', { name: /\+ add shipment/i });
  if (addShipmentButton) {
    fireEvent.click(addShipmentButton);
  }

  const numberInputs = container.querySelectorAll('input[type="number"]');
  fireEvent.change(numberInputs[0], { target: { value: '4' } });
  fireEvent.change(numberInputs[1], { target: { value: '750' } });

  const textInputs = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
  fireEvent.change(textInputs[0], { target: { value: 'Surabaya' } });
  if (overrides.shipperName !== undefined) fireEvent.change(textInputs[1], { target: { value: overrides.shipperName } });
  if (overrides.vehicleNumber !== undefined) fireEvent.change(textInputs[2], { target: { value: overrides.vehicleNumber } });
  if (overrides.notes !== undefined) fireEvent.change(textInputs[3], { target: { value: overrides.notes } });

  if (overrides.shipmentDate !== undefined) {
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: overrides.shipmentDate } });
  }

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'IN_TRANSIT' } });
};

describe('ShipmentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (shipmentService.getAll as jest.Mock).mockResolvedValue([]);
    (shipmentService.getByStatus as jest.Mock).mockResolvedValue([]);
    (shipmentService.create as jest.Mock).mockResolvedValue({ id: 1 });
    (shipmentService.delete as jest.Mock).mockResolvedValue(undefined);
    confirmMock.mockReturnValue(true);
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
    expect(await screen.findByText(/no shipments found/i)).toBeInTheDocument();
  });

  it('renders shipments list with all optional fields and unknown status fallback color', async () => {
    (shipmentService.getAll as jest.Mock).mockResolvedValue([
      makeShipment({
        id: 1,
        status: 'PENDING',
        shipperName: 'PT Logistik',
        vehicleNumber: 'B 1234 XYZ',
        shipmentDate: '2026-02-01',
        deliveryDate: '2026-02-05',
      }),
      makeShipment({ id: 2, status: 'IN_TRANSIT' }),
      makeShipment({ id: 3, status: 'DELIVERED' }),
      makeShipment({ id: 4, status: 'CANCELLED' }),
      makeShipment({ id: 5, status: 'UNKNOWN' as unknown as Shipment['status'] }),
    ]);
    render(<ShipmentsPage />);
    expect(await screen.findByText('Shipment #1')).toBeInTheDocument();
    expect(screen.getByText(/PT Logistik/)).toBeInTheDocument();
    expect(screen.getByText(/B 1234 XYZ/)).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('shows load error from Error', async () => {
    (shipmentService.getAll as jest.Mock).mockRejectedValue(new Error('API down'));
    render(<ShipmentsPage />);
    expect(await screen.findByText('API down')).toBeInTheDocument();
  });

  it('shows fallback load error when thrown value is not Error', async () => {
    (shipmentService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    expect(await screen.findByText('Failed to load shipments')).toBeInTheDocument();
  });

  it('filtering by status calls getByStatus, filtering by All reverts to getAll', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/no shipments found/i);

    fireEvent.click(screen.getByRole('button', { name: 'PENDING' }));
    await waitFor(() => expect(shipmentService.getByStatus).toHaveBeenCalledWith('PENDING'));

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    await waitFor(() => {
      expect((shipmentService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('toggles add shipment form visibility', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/no shipments found/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ add shipment/i }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: /\+ add shipment/i })).toBeInTheDocument();
  });

  it('creates shipment with optional fields populated', async () => {
    (shipmentService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const { container } = render(<ShipmentsPage />);
    await screen.findByText(/no shipments found/i);
    fillForm(container, { shipperName: 'PT X', vehicleNumber: 'B 1', shipmentDate: '2026-05-10', notes: 'rush' });
    fireEvent.click(screen.getByRole('button', { name: /create shipment/i }));

    await waitFor(() => {
      expect(shipmentService.create).toHaveBeenCalledWith({
        harvestId: 4,
        destination: 'Surabaya',
        weight: 750,
        status: 'IN_TRANSIT',
        shipperName: 'PT X',
        vehicleNumber: 'B 1',
        shipmentDate: '2026-05-10',
        notes: 'rush',
      });
    });
    await waitFor(() => {
      expect((shipmentService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('creates shipment with undefined optional fields when blank', async () => {
    const { container } = render(<ShipmentsPage />);
    await screen.findByText(/no shipments found/i);
    fillForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create shipment/i }));

    await waitFor(() => {
      expect(shipmentService.create).toHaveBeenCalledWith({
        harvestId: 4,
        destination: 'Surabaya',
        weight: 750,
        status: 'IN_TRANSIT',
        shipperName: undefined,
        vehicleNumber: undefined,
        shipmentDate: undefined,
        notes: undefined,
      });
    });
  });

  it('reloads with active filter after creating a shipment', async () => {
    render(<ShipmentsPage />);
    await screen.findByText(/no shipments found/i);

    fireEvent.click(screen.getByRole('button', { name: 'PENDING' }));
    await waitFor(() => expect(shipmentService.getByStatus).toHaveBeenCalledWith('PENDING'));

    const container = document.body;
    fillForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create shipment/i }));

    await waitFor(() => {
      expect((shipmentService.getByStatus as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows create error from Error', async () => {
    (shipmentService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
    const { container } = render(<ShipmentsPage />);
    await screen.findByText(/no shipments found/i);
    fillForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create shipment/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (shipmentService.create as jest.Mock).mockRejectedValue('bad');
    const { container } = render(<ShipmentsPage />);
    await screen.findByText(/no shipments found/i);
    fillForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create shipment/i }));
    expect(await screen.findByText('Failed to create shipment')).toBeInTheDocument();
  });

  it('does not delete when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (shipmentService.getAll as jest.Mock).mockResolvedValue([makeShipment()]);
    render(<ShipmentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(shipmentService.delete).not.toHaveBeenCalled();
  });

  it('deletes shipment and reloads list when confirmed', async () => {
    (shipmentService.getAll as jest.Mock)
      .mockResolvedValueOnce([makeShipment()])
      .mockResolvedValueOnce([]);
    render(<ShipmentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => expect(shipmentService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => {
      expect((shipmentService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows delete error from Error', async () => {
    (shipmentService.getAll as jest.Mock).mockResolvedValue([makeShipment()]);
    (shipmentService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<ShipmentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (shipmentService.getAll as jest.Mock).mockResolvedValue([makeShipment()]);
    (shipmentService.delete as jest.Mock).mockRejectedValue('bad');
    render(<ShipmentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Failed to delete shipment')).toBeInTheDocument();
  });
});
