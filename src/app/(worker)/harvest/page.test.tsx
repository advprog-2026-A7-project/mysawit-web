import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WorkerHarvestPage from './page';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/harvest.service', () => ({
  harvestService: {
    getMine: jest.fn(),
    getAll: jest.fn(),
    create: jest.fn(),
  },
}));

describe('WorkerHarvestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({
      id: 'buruh-1',
      username: 'buruh',
      role: 'BURUH',
    });
    (harvestService.getMine as jest.Mock).mockResolvedValue([]);
    (harvestService.create as jest.Mock).mockResolvedValue({ message: 'created', id: 'harvest-1' });
  });

  it('lets a buruh submit a harvest log with photo evidence', async () => {
    render(<WorkerHarvestPage />);

    expect(await screen.findByRole('heading', { name: 'Log Panen Baru' })).toBeInTheDocument();

    const photo = new File(['photo'], 'panen.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('ID Kebun'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Berat Panen (kg)'), { target: { value: '125.5' } });
    fireEvent.change(screen.getByLabelText('Catatan Panen'), { target: { value: 'Panen blok A' } });
    fireEvent.change(screen.getByLabelText('Foto Hasil Panen'), { target: { files: [photo] } });

    fireEvent.submit(screen.getByRole('button', { name: /kirim log panen/i }).closest('form')!);

    await waitFor(() => {
      expect(harvestService.create).toHaveBeenCalledWith({
        plantationId: '1',
        weight: 125.5,
        news: 'Panen blok A',
        files: [photo],
      });
    });
    expect(await screen.findByText('Log panen berhasil dikirim dan menunggu validasi mandor.')).toBeInTheDocument();
  });
});
