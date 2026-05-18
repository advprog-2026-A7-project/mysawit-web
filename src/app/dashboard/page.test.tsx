import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';
import { shipmentService } from '@/services/shipment.service';
import { plantationService } from '@/services/plantation.service';
import { identityService } from '@/services/identity.service';

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
    (authService.getUserInfo as jest.Mock).mockReturnValue({ username: 'budi', role: 'USER' });
    (identityService.listUsers as jest.Mock).mockResolvedValue([{}]);
    (plantationService.getAll as jest.Mock).mockResolvedValue([{}]);
    (harvestService.getAll as jest.Mock).mockResolvedValue([{}]);
    (shipmentService.getAll as jest.Mock).mockResolvedValue([{}]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders user info and dashboard modules when authenticated', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('budi')).toBeInTheDocument();
    expect(screen.queryByText('USER')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /kelola kebun/i })).toHaveAttribute('href', '/dashboard/plantations');
    expect(screen.getByRole('link', { name: /catat panen/i })).toHaveAttribute('href', '/dashboard/harvests');
    expect(screen.getByRole('link', { name: /pantau pengiriman/i })).toHaveAttribute('href', '/dashboard/shipments');
    expect(screen.queryByRole('link', { name: /payroll/i })).not.toBeInTheDocument();
    expect(screen.getByText(/ringkasan operasional kebun/i)).toBeInTheDocument();
  });

  it('handles null user info without crashing', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue(null);

    render(<DashboardPage />);

    expect(await screen.findByText('Pengguna')).toBeInTheDocument();
  });

  it('uses fallback display name when user info fields are empty', async () => {
    (authService.getUserInfo as jest.Mock).mockReturnValue({ username: '', role: '' });

    render(<DashboardPage />);

    expect(await screen.findByText('Pengguna')).toBeInTheDocument();
  });

  it('shows zero stats when summary requests fail', async () => {
    (identityService.listUsers as jest.Mock).mockRejectedValue(new Error('fail'));
    (plantationService.getAll as jest.Mock).mockRejectedValue(new Error('fail'));
    (harvestService.getAll as jest.Mock).mockRejectedValue(new Error('fail'));
    (shipmentService.getAll as jest.Mock).mockRejectedValue(new Error('fail'));

    render(<DashboardPage />);

    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('falls back to zero when a fulfilled stat has no length', async () => {
    (identityService.listUsers as jest.Mock).mockResolvedValue({});

    render(<DashboardPage />);

    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalled());
    const totalUsersCard = screen.getByText('Anggota Tim').closest('.stat-card') as HTMLElement;
    await waitFor(() => expect(totalUsersCard).toHaveTextContent('0'));
  });

  it.each([
    [8, 'Selamat Pagi'],
    [12, 'Selamat Siang'],
    [16, 'Selamat Sore'],
    [19, 'Selamat Malam'],
  ])('renders the %s:00 greeting branch', async (hour, greeting) => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);

    render(<DashboardPage />);

    expect(await screen.findByText(`${greeting},`)).toBeInTheDocument();
  });

  it('refreshes health and stats', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(identityService.listUsers).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /perbarui data/i }));

    await waitFor(() => {
      expect(identityService.listUsers).toHaveBeenCalledTimes(2);
    });
  });
});
