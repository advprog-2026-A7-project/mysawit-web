import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MandorShipmentPage from './page';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';
import { shipmentService } from '@/services/shipment.service';

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/harvest.service', () => ({
  harvestService: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/services/shipment.service', () => ({
  shipmentService: {
    getAll: jest.fn(),
    getAvailableSupirs: jest.fn(),
    create: jest.fn(),
    approveByMandor: jest.fn(),
  },
}));

describe('Mandor shipment negative guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: 'mandor-1', role: 'MANDOR' });
    (shipmentService.getAll as jest.Mock).mockResolvedValue([]);
    (shipmentService.getAvailableSupirs as jest.Mock).mockResolvedValue([
      { userId: 'supir-1', name: 'Supir Kebun A', plantationId: '7' },
    ]);
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 'harvest-250',
        harvesterId: 'buruh-1',
        harvesterName: 'Buruh A',
        plantationId: '7',
        weight: 250,
        status: 'APPROVED',
        createdAt: '2026-05-26T00:00:00',
        updatedAt: '2026-05-26T00:00:00',
      },
      {
        id: 'harvest-200',
        harvesterId: 'buruh-1',
        harvesterName: 'Buruh A',
        plantationId: '7',
        weight: 200,
        status: 'APPROVED',
        createdAt: '2026-05-26T00:00:00',
        updatedAt: '2026-05-26T00:00:00',
      },
      {
        id: 'harvest-rejected',
        harvesterId: 'buruh-1',
        harvesterName: 'Buruh A',
        plantationId: '7',
        weight: 10,
        status: 'REJECTED',
        createdAt: '2026-05-26T00:00:00',
        updatedAt: '2026-05-26T00:00:00',
      },
    ]);
  });

  it('shows only approved harvest options and blocks total weight over 400 kg', async () => {
    render(<MandorShipmentPage />);

    fireEvent.click(await screen.findByRole('button', { name: /\+ buat pengiriman/i }));
    await screen.findByText('250 kg');

    expect(screen.getByText('200 kg')).toBeInTheDocument();
    expect(screen.queryByText('10 kg')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'supir-1' } });
    fireEvent.change(screen.getByLabelText('Tujuan Pabrik'), { target: { value: 'Pabrik Test' } });

    for (const checkbox of screen.getAllByRole('checkbox')) {
      fireEvent.click(checkbox);
    }

    expect(await screen.findByText('Total muatan melebihi kapasitas maksimum 400 kg.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tugaskan pengiriman/i })).toBeDisabled();

    fireEvent.submit(screen.getByRole('button', { name: /tugaskan pengiriman/i }).closest('form')!);

    await waitFor(() => {
      expect(shipmentService.create).not.toHaveBeenCalled();
    });
  });
});
