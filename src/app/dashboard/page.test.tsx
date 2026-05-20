import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';
import { shipmentService } from '@/services/shipment.service';
import { plantationService } from '@/services/plantation.service';
import { identityService } from '@/services/identity.service';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/harvest.service', () => ({ harvestService: { getAll: jest.fn() } }));
jest.mock('@/services/shipment.service', () => ({ shipmentService: { getAll: jest.fn() } }));
jest.mock('@/services/plantation.service', () => ({ plantationService: { getAll: jest.fn() } }));
jest.mock('@/services/identity.service', () => ({ identityService: { listUsers: jest.fn() } }));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({ username: 'budi', role: 'ADMIN' });
    (identityService.listUsers as jest.Mock).mockResolvedValue([{}, {}]);
    (plantationService.getAll as jest.Mock).mockResolvedValue([{}]);
    (harvestService.getAll as jest.Mock).mockResolvedValue([{}, {}, {}]);
    (shipmentService.getAll as jest.Mock).mockResolvedValue([{}, {}]);
  });

  it('renders user info, quick actions, and operational stats', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('budi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /kelola kebun/i })).toHaveAttribute('href', '/dashboard/plantations');
    expect(screen.getByRole('link', { name: /catat panen/i })).toHaveAttribute('href', '/dashboard/harvests');
    expect(screen.getByRole('link', { name: /pantau pengiriman/i })).toHaveAttribute('href', '/dashboard/shipments');
    expect(screen.getByText(/ringkasan operasional kebun/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Anggota Tim').parentElement).toHaveTextContent('2'));
    expect(screen.getByText('Kebun Terdaftar').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Catatan Panen').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Pengiriman').parentElement).toHaveTextContent('2');
  });

  it('uses fallback display name and zero stats when requests fail', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue(null);
    (identityService.listUsers as jest.Mock).mockRejectedValue(new Error('identity down'));
    (plantationService.getAll as jest.Mock).mockRejectedValue(new Error('plantation down'));
    (harvestService.getAll as jest.Mock).mockRejectedValue(new Error('harvest down'));
    (shipmentService.getAll as jest.Mock).mockRejectedValue(new Error('shipment down'));

    render(<DashboardPage />);

    expect(await screen.findByText('Pengguna')).toBeInTheDocument();
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());
    expect(screen.getByText('Anggota Tim').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Kebun Terdaftar').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Catatan Panen').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Pengiriman').parentElement).toHaveTextContent('0');
  });

  it('refreshes dashboard stats from the button', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /perbarui data/i }));

    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalledTimes(2));
  });
});
