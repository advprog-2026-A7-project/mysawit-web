import { render, screen, waitFor } from '@testing-library/react';
import MandorPlantationsPage from './page';
import { authService } from '@/services/auth.service';
import { plantationService } from '@/services/plantation.service';

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/plantation.service', () => ({
  plantationService: {
    getByMandor: jest.fn(),
    getSupirDetails: jest.fn(),
  },
}));

describe('MandorPlantationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({
      id: 'mandor-1',
      username: 'mandor_manual',
      role: 'MANDOR',
    });
    (plantationService.getByMandor as jest.Mock).mockResolvedValue([
      {
        id: 7,
        code: 'KB-A-001',
        name: 'Kebun test manual',
        location: 'Bekasi',
        area: 12,
        mandorId: 'mandor-1',
        supirIds: ['supir-1'],
        createdAt: '',
        updatedAt: '',
      },
    ]);
    (plantationService.getSupirDetails as jest.Mock).mockResolvedValue([
      { id: 'supir-1', name: 'supir_manual' },
    ]);
  });

  it('loads plantations assigned to the logged-in mandor', async () => {
    render(<MandorPlantationsPage />);

    expect(await screen.findByText('Kebun test manual')).toBeInTheDocument();
    expect(screen.getByText('KB-A-001')).toBeInTheDocument();
    expect(screen.getByText('supir_manual')).toBeInTheDocument();

    await waitFor(() => {
      expect(plantationService.getByMandor).toHaveBeenCalledWith('mandor-1');
      expect(plantationService.getSupirDetails).toHaveBeenCalledWith(7);
    });
  });
});
