import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminShipmentPage from './page';
import { shipmentService } from '@/services/shipment.service';

jest.mock('@/services/shipment.service', () => ({
  shipmentService: {
    getAll: jest.fn(),
    approveByAdmin: jest.fn(),
  },
}));

const mandorApprovedShipment = {
  id: 'shipment-1',
  mandorUserId: 'mandor-1',
  mandorName: 'Mandor Test',
  supirUserId: 'supir-1',
  supirName: 'Supir Test',
  destination: 'Pabrik Test',
  plantationId: '7',
  totalKg: 120,
  status: 'MANDOR_APPROVED' as const,
  createdAt: '2026-05-26T00:00:00',
  updatedAt: '2026-05-26T00:00:00',
};

describe('Admin shipment negative guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (shipmentService.getAll as jest.Mock).mockResolvedValue([mandorApprovedShipment]);
  });

  it('blocks admin rejection without a reason before calling the API', async () => {
    render(<AdminShipmentPage />);

    fireEvent.click(await screen.findByRole('button', { name: /tolak/i }));
    fireEvent.submit(screen.getByRole('button', { name: /simpan keputusan/i }).closest('form')!);

    expect(await screen.findByText('Alasan penolakan wajib diisi')).toBeInTheDocument();
    expect(shipmentService.approveByAdmin).not.toHaveBeenCalled();
  });

  it('blocks partial rejection when accepted kg exceeds the shipment total', async () => {
    render(<AdminShipmentPage />);

    fireEvent.click(await screen.findByRole('button', { name: /koreksi parsial/i }));
    fireEvent.change(screen.getByLabelText(/berat yang disetujui/i), { target: { value: '121' } });
    fireEvent.change(screen.getByLabelText(/alasan koreksi/i), { target: { value: 'Susut tidak sesuai' } });
    fireEvent.submit(screen.getByRole('button', { name: /simpan keputusan/i }).closest('form')!);

    expect(await screen.findByText('Kilogram sawit yang diakui tidak boleh melebihi total pengiriman')).toBeInTheDocument();
    expect(shipmentService.approveByAdmin).not.toHaveBeenCalled();
  });

  it('sends a valid partial rejection payload', async () => {
    (shipmentService.approveByAdmin as jest.Mock).mockResolvedValue({
      ...mandorApprovedShipment,
      status: 'PARTIALLY_REJECTED',
    });

    render(<AdminShipmentPage />);

    fireEvent.click(await screen.findByRole('button', { name: /koreksi parsial/i }));
    fireEvent.change(screen.getByLabelText(/berat yang disetujui/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText(/alasan koreksi/i), { target: { value: 'Susut valid' } });
    fireEvent.submit(screen.getByRole('button', { name: /simpan keputusan/i }).closest('form')!);

    await waitFor(() => {
      expect(shipmentService.approveByAdmin).toHaveBeenCalledWith('shipment-1', {
        status: 'PARTIALLY_REJECTED',
        rejectionReason: 'Susut valid',
        kgAccepted: 100,
      });
    });
  });
});
