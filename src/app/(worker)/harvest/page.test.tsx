import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WorkerHarvestPage from './page';
import { authService } from '@/services/auth.service';
import { harvestService } from '@/services/harvest.service';
import { plantationService } from '@/services/plantation.service';

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

jest.mock('@/services/plantation.service', () => ({
  plantationService: {
    getByMandor: jest.fn(),
  },
}));

describe('WorkerHarvestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({
      id: 'buruh-1',
      username: 'buruh',
      role: 'BURUH',
      mandorId: 'mandor-1',
    });
    (harvestService.getMine as jest.Mock).mockResolvedValue([]);
    (harvestService.create as jest.Mock).mockResolvedValue({ message: 'created', id: 'harvest-1' });
    (plantationService.getByMandor as jest.Mock).mockResolvedValue([
      {
        id: 1,
        code: 'KB-A-001',
        name: 'Kebun A',
        location: 'Riau',
        area: 10,
        mandorId: 'mandor-1',
        createdAt: '',
        updatedAt: '',
      },
    ]);
  });

  it('lets a buruh submit a harvest log with photo evidence', async () => {
    render(<WorkerHarvestPage />);

    expect(await screen.findByRole('heading', { name: 'Log Panen Baru' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'KB-A-001 - Kebun A' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'KB-B-001 - Kebun B' })).not.toBeInTheDocument();

    const photo = new File(['photo'], 'panen.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Kebun'), { target: { value: '1' } });
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

  it('blocks a second harvest log on the same day', async () => {
    (harvestService.getMine as jest.Mock).mockResolvedValue([
      {
        id: 'harvest-today',
        harvesterId: 'buruh-1',
        harvesterName: 'buruh',
        plantationId: '1',
        weight: 100,
        status: 'PENDING',
        harvestDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    render(<WorkerHarvestPage />);

    expect(await screen.findByText('Catatan panen hari ini sudah tersimpan. Form akan aktif lagi besok.')).toBeInTheDocument();
    expect(screen.getByTestId('harvest-create-button')).toBeDisabled();
    expect(harvestService.create).not.toHaveBeenCalled();
  });
});
