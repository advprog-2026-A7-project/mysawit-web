import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlantationsPage from './page';
import { adminService } from '@/services/admin.service';
import { authService } from '@/services/auth.service';
import { identityService } from '@/services/identity.service';
import { plantationService } from '@/services/plantation.service';

jest.mock('@/services/auth.service', () => ({
  authService: {
    getUserInfo: jest.fn(),
  },
}));

jest.mock('@/services/plantation.service', () => ({
  plantationService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assignMandor: jest.fn(),
    unassignMandor: jest.fn(),
    transferMandor: jest.fn(),
    getSupirs: jest.fn(),
    assignSupir: jest.fn(),
    unassignSupir: jest.fn(),
  },
}));

jest.mock('@/services/identity.service', () => ({
  identityService: {
    listUsers: jest.fn(),
  },
}));

jest.mock('@/services/admin.service', () => ({
  adminService: {
    assignMandor: jest.fn(),
    unassignMandor: jest.fn(),
  },
}));

describe('Admin plantations page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserInfo as jest.Mock).mockReturnValue({ id: 'admin-1', role: 'ADMIN' });
    (plantationService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 1,
        name: 'Kebun A',
        location: 'Bogor',
        area: 12,
        mandorId: 'mandor-1',
        supirIds: [],
        coordinates: [],
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
      },
    ]);
    (identityService.listUsers as jest.Mock).mockResolvedValue([
      {
        id: 'mandor-1',
        username: 'mandor-a',
        email: 'mandor@example.com',
        name: 'Mandor A',
        role: 'MANDOR',
        createdAt: '2026-05-01T00:00:00Z',
      },
      {
        id: 'buruh-1',
        username: 'buruh-a',
        email: 'buruh@example.com',
        name: 'Buruh A',
        role: 'BURUH',
        createdAt: '2026-05-01T00:00:00Z',
      },
    ]);
    (adminService.assignMandor as jest.Mock).mockResolvedValue({ message: 'ok' });
  });

  it('assigns a plantation mandor to a buruh from the admin plantations page', async () => {
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Penugasan Buruh' }));

    expect(await screen.findByRole('heading', { name: 'Assign Mandor ke Buruh' })).toBeInTheDocument();
    expect(screen.getByText('Mandor mengikuti penugasan pada kebun yang dipilih.')).toBeInTheDocument();

    await screen.findByText('Buruh A - buruh@example.com');

    const [plantationSelect, mandorSelect, buruhSelect] = screen.getAllByRole('combobox');
    fireEvent.change(plantationSelect, { target: { value: '1' } });
    expect(mandorSelect).toHaveValue('mandor-1');

    fireEvent.change(buruhSelect, { target: { value: 'buruh-1' } });
    fireEvent.click(screen.getByRole('button', { name: /simpan penugasan mandor/i }));

    await waitFor(() => {
      expect(adminService.assignMandor).toHaveBeenCalledWith('buruh-1', 'mandor-1');
    });
  });

  it('blocks invalid plantation area before calling the API', async () => {
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: '+ Tambah Kebun' }));
    fireEvent.change(screen.getByPlaceholderText('KB-A-001'), { target: { value: 'KB-NEG-001' } });
    fireEvent.change(screen.getByPlaceholderText('Kebun Blok A'), { target: { value: 'Kebun Negatif' } });
    fireEvent.change(screen.getByPlaceholderText('Kalimantan Selatan'), { target: { value: 'Riau' } });
    fireEvent.change(screen.getByPlaceholderText('25.5'), { target: { value: '-1' } });
    fireEvent.submit(screen.getByTestId('kebun-create-button').closest('form')!);

    expect(await screen.findByText('Luas kebun harus lebih dari 0 hektare')).toBeInTheDocument();
    expect(plantationService.create).not.toHaveBeenCalled();
  });

  it('blocks incomplete plantation coordinates before calling the API', async () => {
    render(<PlantationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: '+ Tambah Kebun' }));
    fireEvent.change(screen.getByPlaceholderText('KB-A-001'), { target: { value: 'KB-NEG-002' } });
    fireEvent.change(screen.getByPlaceholderText('Kebun Blok A'), { target: { value: 'Kebun Koordinat' } });
    fireEvent.change(screen.getByPlaceholderText('Kalimantan Selatan'), { target: { value: 'Riau' } });
    fireEvent.change(screen.getByPlaceholderText('25.5'), { target: { value: '12' } });
    fireEvent.change(screen.getAllByPlaceholderText('Lat')[0], { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('kebun-create-button').closest('form')!);

    expect(await screen.findByText('Koordinat 4 sudut wajib lengkap dan valid')).toBeInTheDocument();
    expect(plantationService.create).not.toHaveBeenCalled();
  });
});
