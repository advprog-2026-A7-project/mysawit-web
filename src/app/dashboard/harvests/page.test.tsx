import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HarvestsPage from './page';
import { harvestService } from '@/services/harvest.service';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/services/harvest.service', () => ({
  harvestService: {
    getAll: jest.fn(),
    getMine: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

type MockUser = { id: string; role: string } | null;
let mockAuth: { user: MockUser } = { user: { id: 'u1', role: 'MANDOR' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

const fillCreateForm = (
  overrides: Partial<{ plantationId: string; weight: string; news: string; files: File[] }> = {}
) => {
  fireEvent.click(screen.getByRole('button', { name: /\+ Catat Panen/i }));
  fireEvent.change(screen.getByPlaceholderText('Kebun'), {
    target: { value: overrides.plantationId ?? 'plantation-uuid-1' },
  });
  fireEvent.change(screen.getByPlaceholderText('Berat panen (kg)'), {
    target: { value: overrides.weight ?? '120.5' },
  });
  fireEvent.change(screen.getByPlaceholderText('Keterangan panen'), {
    target: { value: overrides.news ?? 'morning batch' },
  });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: overrides.files ?? [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
};

const submitCreateForm = () => {
  const panel = screen.getByText('Catat Panen').closest('div.bg-white') as HTMLElement;
  fireEvent.submit(panel.querySelector('form') as HTMLFormElement);
};

describe('HarvestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    asMandor();
    (harvestService.getAll as jest.Mock).mockResolvedValue([]);
    (harvestService.getMine as jest.Mock).mockResolvedValue([]);
    (harvestService.create as jest.Mock).mockResolvedValue({ id: 'h-new' });
    (harvestService.updateStatus as jest.Mock).mockResolvedValue({ id: 'h-x' });
  });

  // -------- shared: no role gate --------

  it('does not fetch when role is null and stays in the loading state', async () => {
    asNoRole();
    render(<HarvestsPage />);
    expect(screen.getByText(/Memuat catatan panen/i)).toBeInTheDocument();
    resolvePromise?.([]);
    expect(await screen.findByText(/Belum ada catatan panen/i)).toBeInTheDocument();
  });

  // -------- MANDOR --------

  describe('as MANDOR', () => {
    it('renders supervisor heading, hides "+ Log Harvest", shows status form, and loads via getAll', async () => {
      render(<HarvestsPage />);
      await waitFor(() => {
        expect(harvestService.getAll).toHaveBeenCalledWith({
          harvesterName: undefined,
          startDate: undefined,
          endDate: undefined,
        });
      });
      expect(screen.getByText(/team harvest validation/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /\+ log harvest/i })).not.toBeInTheDocument();
      expect(screen.getByText(/update harvest status/i)).toBeInTheDocument();
      expect(screen.getByText(/filter team harvest logs/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search harvester name/i)).toBeInTheDocument();
      expect(await screen.findByText(/no harvest data/i)).toBeInTheDocument();
      expect(screen.getByText(/adjust the filter to see your team’s records/i)).toBeInTheDocument();
    });

    it('applies filters and calls getAll with trimmed values', async () => {
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

    const harvester = await screen.findByText('Budi');
    const card = harvester.closest('div.bg-white') as HTMLElement;
    expect(within(card).getByText('Disetujui')).toBeInTheDocument();
    expect(within(card).getByText(/Sudah diverifikasi/i)).toBeInTheDocument();
    expect(screen.getByText('fresh batch')).toBeInTheDocument();
    expect(screen.getByText(/2 terlampir/i)).toBeInTheDocument();
  });

    it('renders harvest card with Harvester row, news, photos, rejection reason, and formatted date', async () => {
      (harvestService.getAll as jest.Mock).mockResolvedValue([
        {
          id: 'abcd1234-uuid-x',
          plantationId: 'plant-1',
          weight: 100,
          status: 'REJECTED',
          harvesterName: 'Budi',
          foremanId: 'foreman-1',
          news: 'fresh batch',
          rejectionReason: 'too wet',
          photos: ['a.jpg', 'b.jpg'],
          harvestDate: '2026-01-01T08:00:00Z',
        },
      ]);

      render(<HarvestsPage />);
      const heading = await screen.findByText(/harvest #abcd1234/i);
      const card = heading.closest('div.bg-white') as HTMLElement;
      expect(within(card).getByText('REJECTED')).toBeInTheDocument();
      expect(within(card).getByText('Budi')).toBeInTheDocument();
      expect(within(card).getByText('foreman-1')).toBeInTheDocument();
      expect(within(card).getByText('fresh batch')).toBeInTheDocument();
      expect(within(card).getByText('too wet')).toBeInTheDocument();
      expect(within(card).getByText('2 attached')).toBeInTheDocument();
    });

    it('falls back to harvester id, default PENDING status, and "-" placeholders when fields are missing', async () => {
      (harvestService.getAll as jest.Mock).mockResolvedValue([
        { id: 'zzzzzzzz-uuid', plantationId: 'p9', weight: 50, harvesterId: 'harvester-only' },
      ]);
      render(<HarvestsPage />);
      const harvesterEl = await screen.findByText('harvester-only');
      const card = harvesterEl.closest('div.bg-white') as HTMLElement;
      expect(within(card).getByText('PENDING')).toBeInTheDocument();
      expect(within(card).getAllByText('-').length).toBeGreaterThan(0);
    });

    const harvesterEl = await screen.findByText('harvester-only');
    const card = harvesterEl.closest('div.bg-white') as HTMLElement;
    expect(within(card).getByText('Menunggu')).toBeInTheDocument();
    expect(within(card).getAllByText('-').length).toBeGreaterThan(0);
  });

    it('renders date verbatim when value is not parseable', async () => {
      (harvestService.getAll as jest.Mock).mockResolvedValue([
        { id: 'bad-date-uuid', plantationId: 'p', weight: 10, harvestDate: 'not-a-date' },
      ]);
      render(<HarvestsPage />);
      expect(await screen.findByText('not-a-date')).toBeInTheDocument();
    });

    it('shows "-" when harvestDate is missing', async () => {
      (harvestService.getAll as jest.Mock).mockResolvedValue([
        { id: 'no-date-uuid', plantationId: 'p', weight: 10 },
      ]);
      render(<HarvestsPage />);
      const heading = await screen.findByText(/harvest #no-date-/i);
      const card = heading.closest('div.bg-white') as HTMLElement;
      const dateLabel = within(card).getByText('Date:');
      expect(dateLabel.parentElement?.textContent).toMatch(/Date:\s*-/);
    });

    it('computes stats memo across statuses', async () => {
      (harvestService.getAll as jest.Mock).mockResolvedValue([
        { id: '1', plantationId: 'a', weight: 100, status: 'PENDING' },
        { id: '2', plantationId: 'a', weight: 80, status: 'APPROVED' },
        { id: '3', plantationId: 'a', weight: 60, status: 'REJECTED' },
      ]);
      render(<HarvestsPage />);
      await screen.findByText(/harvest #1/i);

      const totalLogs = screen.getByText('Total Logs').parentElement!;
      expect(within(totalLogs).getByText('3')).toBeInTheDocument();
      const approved = screen.getByText('Approved').parentElement!;
      expect(within(approved).getByText('1')).toBeInTheDocument();
      const pendingRejected = screen.getByText('Pending / Rejected').parentElement!;
      expect(within(pendingRejected).getByText(/1\s*\/\s*1/)).toBeInTheDocument();
    });

    await screen.findAllByText(/Catatan Panen/);

    const totalLogs = screen.getByText('Total Catatan').parentElement!;
    expect(within(totalLogs).getByText('3')).toBeInTheDocument();

    const approved = screen.getByText('Disetujui').parentElement!;
    expect(within(approved).getByText('1')).toBeInTheDocument();

    const pendingRejected = screen.getByText('Menunggu / Ditolak').parentElement!;
    expect(within(pendingRejected).getByText(/1\s*\/\s*1/)).toBeInTheDocument();
  });

      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(screen.getByText(`Harvest #${makeId(1).slice(0, 8)}`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '2' }));
      expect(screen.getByText(`Harvest #${makeId(11).slice(0, 8)}`)).toBeInTheDocument();
    });

    expect(await screen.findAllByText(/Catatan Panen/)).toHaveLength(10);
    const showing = screen.getByText(/Menampilkan/);
    expect(showing).toHaveTextContent('Menampilkan 1 sampai 10 dari 11 catatan');
    expect(screen.queryByText(`${makeId(11)}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(screen.getAllByText(/Catatan Panen/)).toHaveLength(1);
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent('Menampilkan 11 sampai 11 dari 11 catatan');

    fireEvent.click(screen.getByRole('button', { name: 'Sebelumnya' }));
    expect(screen.getAllByText(/Catatan Panen/)).toHaveLength(10);
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent('Menampilkan 1 sampai 10 dari 11 catatan');

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getAllByText(/Catatan Panen/)).toHaveLength(1);
  });

  it('resets to page 1 when toggling the add-harvest form', async () => {
    const makeId = (n: number) => `${String(n).padStart(8, '0')}-uuid`;
    (harvestService.getAll as jest.Mock).mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        id: makeId(index + 1),
        plantationId: 'plant-1',
        weight: 100,
      }))
    );
    render(<HarvestsPage />);
    await screen.findAllByText(/Catatan Panen/);

    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent('Menampilkan 11 sampai 11 dari 11 catatan');

    fireEvent.click(screen.getByRole('button', { name: /\+ Catat Panen/i }));
    expect(screen.getByText(/Menampilkan/)).toHaveTextContent('Menampilkan 1 sampai 10 dari 11 catatan');
  });

    it('shows status update error from Error', async () => {
      (harvestService.updateStatus as jest.Mock).mockRejectedValue(new Error('Status failed'));
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);
      fireEvent.change(screen.getByPlaceholderText(/harvest log uuid/i), { target: { value: 'h-err' } });
      fireEvent.click(screen.getByRole('button', { name: /update status/i }));
      expect(await screen.findByText('Status failed')).toBeInTheDocument();
    });

  it('shows fallback load error when thrown value is not Error', async () => {
    (harvestService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<HarvestsPage />);
    expect(await screen.findByText('Gagal memuat catatan panen')).toBeInTheDocument();
  });

  it('applies filters and calls getAll with trimmed parameters', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fireEvent.change(screen.getByPlaceholderText('Nama pekerja'), { target: { value: 'Andi' } });
    const [startDate, endDate] = screen.getAllByDisplayValue('').filter(
      (el) => (el as HTMLInputElement).type === 'datetime-local'
    ) as HTMLInputElement[];
    fireEvent.change(startDate, { target: { value: '2026-01-01T00:00' } });
    fireEvent.change(endDate, { target: { value: '2026-01-31T23:59' } });
    fireEvent.click(screen.getByRole('button', { name: /Terapkan Filter/i }));

    await waitFor(() => {
      expect(harvestService.getAll).toHaveBeenLastCalledWith({
        harvesterName: 'Andi',
        startDate: '2026-01-01T00:00',
        endDate: '2026-01-31T23:59',
      });
    });

  it('applies filters with undefined values when fields are blank', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);
    fireEvent.click(screen.getByRole('button', { name: /Terapkan Filter/i }));
    await waitFor(() => {
      expect(harvestService.getAll).toHaveBeenLastCalledWith({
        harvesterName: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

  it('toggles add-harvest form visibility', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ Catat Panen/i }));
    expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Batal/i }));
    expect(screen.getByRole('button', { name: /\+ Catat Panen/i })).toBeInTheDocument();
  });

  it('creates harvest with attached files, resets the form, and reloads', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fillCreateForm({
      plantationId: 'plant-uuid',
      weight: '42.5',
      news: 'good day',
    });
    submitCreateForm();

    await waitFor(() => {
      expect(harvestService.create).toHaveBeenCalledWith({
        plantationId: 'plant-uuid',
        weight: 42.5,
        news: 'good day',
        files: expect.any(Array),
      });
      expect(harvestService.getAll).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { level: 1, name: /my harvest logs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ log harvest/i })).toBeInTheDocument();
      expect(screen.queryByText(/update harvest status/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/search harvester name/i)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /filter my harvest logs/i })).toBeInTheDocument();
      expect(await screen.findByText(/no harvest data/i)).toBeInTheDocument();
      expect(screen.getByText(/log a new harvest or adjust the filter/i)).toBeInTheDocument();
    });

    it('applies status + date filters and calls getMine', async () => {
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      const dateInputs = screen
        .getAllByDisplayValue('')
        .filter((el) => (el as HTMLInputElement).type === 'datetime-local') as HTMLInputElement[];
      fireEvent.change(dateInputs[0], { target: { value: '2026-02-01T00:00' } });
      fireEvent.change(dateInputs[1], { target: { value: '2026-02-28T23:59' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'APPROVED' } });

      fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));

      await waitFor(() => {
        expect(harvestService.getMine).toHaveBeenLastCalledWith({
          startDate: '2026-02-01T00:00',
          endDate: '2026-02-28T23:59',
          status: 'APPROVED',
        });
      });
    });
    // form closed, button label switches back
    expect(screen.getByRole('button', { name: /\+ Catat Panen/i })).toBeInTheDocument();
  });

  it('requires at least one harvest photo before creating', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fillCreateForm({ files: [] });
    submitCreateForm();

    expect(await screen.findByText('Minimal 1 foto hasil panen harus dilampirkan')).toBeInTheDocument();
    expect(harvestService.create).not.toHaveBeenCalled();
  });

  it('shows create error from Error', async () => {
    (harvestService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);
    fillCreateForm();
    submitCreateForm();
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (harvestService.create as jest.Mock).mockRejectedValue('bad');
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);
    fillCreateForm();
    submitCreateForm();
    expect(await screen.findByText('Gagal menyimpan catatan panen')).toBeInTheDocument();
  });

  it('updates status as REJECTED with reason', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fireEvent.change(screen.getByPlaceholderText('Nomor catatan panen'), { target: { value: 'h-9' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
    fireEvent.change(screen.getByPlaceholderText('Alasan penolakan'), { target: { value: 'low quality' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));

    await waitFor(() => {
      expect(harvestService.updateStatus).toHaveBeenCalledWith({
        id: 'h-9',
        status: 'REJECTED',
        rejectionReason: 'low quality',
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));
      });

      await waitFor(() => {
        expect(harvestService.create).toHaveBeenCalledWith({
          plantationId: 'plant-1',
          weight: 42.5,
          news: 'good day',
          photos: ['http://a.jpg', 'http://b.jpg'],
        });
      });
      // getMine called once on mount and again after create.
      await waitFor(() => {
        expect((harvestService.getMine as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
      });
      expect(screen.getByRole('button', { name: /\+ log harvest/i })).toBeInTheDocument();
    });

  it('updates status as REJECTED with undefined reason when blank', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fireEvent.change(screen.getByPlaceholderText('Nomor catatan panen'), { target: { value: 'h-10' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));

      await act(async () => {
        resolveCreate?.({ id: 'h-x' });
      });
    });

  it('updates status as APPROVED with undefined rejection reason regardless of input', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);

    fireEvent.change(screen.getByPlaceholderText('Nomor catatan panen'), { target: { value: 'h-11' } });
    fireEvent.change(screen.getByPlaceholderText('Alasan penolakan'), { target: { value: 'should be ignored' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));
      });
      expect(await screen.findByText('Create failed')).toBeInTheDocument();
    });

  it('shows status update error from Error', async () => {
    (harvestService.updateStatus as jest.Mock).mockRejectedValue(new Error('Status failed'));
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);
    fireEvent.change(screen.getByPlaceholderText('Nomor catatan panen'), { target: { value: 'h-err' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));
    expect(await screen.findByText('Status failed')).toBeInTheDocument();
  });

  it('shows fallback status update error when thrown value is not Error', async () => {
    (harvestService.updateStatus as jest.Mock).mockRejectedValue('boom');
    render(<HarvestsPage />);
    await screen.findByText(/Belum ada catatan panen/i);
    fireEvent.change(screen.getByPlaceholderText('Nomor catatan panen'), { target: { value: 'h-err' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Status/i }));
    expect(await screen.findByText('Gagal memperbarui status panen')).toBeInTheDocument();
  });
});
