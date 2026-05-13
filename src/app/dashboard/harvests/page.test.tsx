import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HarvestsPage from './page';
import { harvestService } from '@/services/harvest.service';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();
const routerMock = { push: pushMock };

jest.mock('next/navigation', () => ({
  useRouter: () => routerMock,
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
    create: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
  },
}));

const fillCreateForm = (
  overrides: Partial<{ plantationId: string; weight: string; news: string; photos: string }> = {}
) => {
  fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
  fireEvent.change(screen.getByPlaceholderText('Plantation UUID'), {
    target: { value: overrides.plantationId ?? 'plantation-uuid-1' },
  });
  fireEvent.change(screen.getByPlaceholderText('Weight kg'), {
    target: { value: overrides.weight ?? '120.5' },
  });
  fireEvent.change(screen.getByPlaceholderText('Harvest news'), {
    target: { value: overrides.news ?? 'morning batch' },
  });
  fireEvent.change(screen.getByPlaceholderText('Photo URLs, one per line'), {
    target: { value: overrides.photos ?? '' },
  });
};

describe('HarvestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (harvestService.getAll as jest.Mock).mockResolvedValue([]);
    (harvestService.create as jest.Mock).mockResolvedValue({ id: 'h-1' });
    (harvestService.updateStatus as jest.Mock).mockResolvedValue({ id: 'h-1' });
  });

  it('redirects to login when user is not authenticated', async () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false);
    render(<HarvestsPage />);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(harvestService.getAll).not.toHaveBeenCalled();
  });

  it('shows loading state then empty state', async () => {
    let resolvePromise: ((value: unknown) => void) | undefined;
    (harvestService.getAll as jest.Mock).mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    render(<HarvestsPage />);
    expect(screen.getByText(/loading harvest records/i)).toBeInTheDocument();
    resolvePromise?.([]);
    expect(await screen.findByText(/no harvest data/i)).toBeInTheDocument();
  });

  it('renders harvests list with optional fields populated', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 'abcd1234-uuid-rest',
        plantationId: 'plant-1',
        harvestDate: '2026-01-01T08:00:00Z',
        weight: 100,
        status: 'APPROVED',
        harvesterName: 'Budi',
        foremanId: 'foreman-1',
        news: 'fresh batch',
        photos: ['http://example.com/a.jpg', 'http://example.com/b.jpg'],
      },
    ]);

    render(<HarvestsPage />);

    const heading = await screen.findByText(/Harvest #abcd1234/);
    const card = heading.closest('div.bg-white') as HTMLElement;
    expect(within(card).getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('foreman-1')).toBeInTheDocument();
    expect(screen.getByText('fresh batch')).toBeInTheDocument();
    expect(screen.getByText('2 attached')).toBeInTheDocument();
  });

  it('falls back to harvester id, default status, and dash placeholders when optional fields are missing', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 'zzzzzzzz-uuid',
        plantationId: 'plant-9',
        weight: 50,
        harvesterId: 'harvester-only',
      },
    ]);

    render(<HarvestsPage />);

    const harvesterEl = await screen.findByText('harvester-only');
    const card = harvesterEl.closest('div.bg-white') as HTMLElement;
    expect(within(card).getByText('PENDING')).toBeInTheDocument();
    expect(within(card).getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders rejection reason when present', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 'reject-uuid',
        plantationId: 'plant-1',
        weight: 20,
        status: 'REJECTED',
        rejectionReason: 'too wet',
      },
    ]);
    render(<HarvestsPage />);
    expect(await screen.findByText('too wet')).toBeInTheDocument();
  });

  it('renders date as-is when value is not parseable', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      {
        id: 'bad-date-uuid',
        plantationId: 'p',
        weight: 10,
        harvestDate: 'not-a-date',
      },
    ]);
    render(<HarvestsPage />);
    expect(await screen.findByText('not-a-date')).toBeInTheDocument();
  });

  it('computes stats memo across statuses', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      { id: '1', plantationId: 'a', weight: 100, status: 'PENDING' },
      { id: '2', plantationId: 'a', weight: 80, status: 'APPROVED' },
      { id: '3', plantationId: 'a', weight: 60, status: 'REJECTED' },
    ]);
    render(<HarvestsPage />);

    await screen.findByText(/Harvest #1/);

    const totalLogs = screen.getByText('Total Logs').parentElement!;
    expect(within(totalLogs).getByText('3')).toBeInTheDocument();

    const approved = screen.getByText('Approved').parentElement!;
    expect(within(approved).getByText('1')).toBeInTheDocument();

    const pendingRejected = screen.getByText('Pending / Rejected').parentElement!;
    expect(within(pendingRejected).getByText(/1\s*\/\s*1/)).toBeInTheDocument();
  });

  it('paginates harvests when more than ten records are returned', async () => {
    const makeId = (n: number) => `${String(n).padStart(8, '0')}-uuid`;
    (harvestService.getAll as jest.Mock).mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        id: makeId(index + 1),
        plantationId: 'plant-1',
        weight: 100,
        status: 'PENDING',
      }))
    );

    render(<HarvestsPage />);

    expect(await screen.findByText(`Harvest #${makeId(1).slice(0, 8)}`)).toBeInTheDocument();
    const showing = screen.getByText(/Showing/);
    expect(showing).toHaveTextContent('Showing 1 to 10 of 11 entries');
    expect(screen.queryByText(`Harvest #${makeId(11).slice(0, 8)}`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(`Harvest #${makeId(11).slice(0, 8)}`)).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11 to 11 of 11 entries');

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText(`Harvest #${makeId(1).slice(0, 8)}`)).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 10 of 11 entries');

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText(`Harvest #${makeId(11).slice(0, 8)}`)).toBeInTheDocument();
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
    await screen.findByText(`Harvest #${makeId(1).slice(0, 8)}`);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11 to 11 of 11 entries');

    fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 10 of 11 entries');
  });

  it('shows load error from Error', async () => {
    (harvestService.getAll as jest.Mock).mockRejectedValue(new Error('Failed to load from API'));
    render(<HarvestsPage />);
    expect(await screen.findByText('Failed to load from API')).toBeInTheDocument();
  });

  it('shows fallback load error when thrown value is not Error', async () => {
    (harvestService.getAll as jest.Mock).mockRejectedValue('bad');
    render(<HarvestsPage />);
    expect(await screen.findByText('Failed to fetch harvests')).toBeInTheDocument();
  });

  it('applies filters and calls getAll with trimmed parameters', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);

    fireEvent.change(screen.getByPlaceholderText('Harvester name'), { target: { value: 'Andi' } });
    const [startDate, endDate] = screen.getAllByDisplayValue('').filter(
      (el) => (el as HTMLInputElement).type === 'datetime-local'
    ) as HTMLInputElement[];
    fireEvent.change(startDate, { target: { value: '2026-01-01T00:00' } });
    fireEvent.change(endDate, { target: { value: '2026-01-31T23:59' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));

    await waitFor(() => {
      expect(harvestService.getAll).toHaveBeenLastCalledWith({
        harvesterName: 'Andi',
        startDate: '2026-01-01T00:00',
        endDate: '2026-01-31T23:59',
      });
    });
  });

  it('applies filters with undefined values when fields are blank', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);
    fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));
    await waitFor(() => {
      expect(harvestService.getAll).toHaveBeenLastCalledWith({
        harvesterName: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  it('toggles add-harvest form visibility', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);
    fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /\+ log harvest/i })).toBeInTheDocument();
  });

  it('creates harvest, parses photos, resets the form, and reloads', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);

    fillCreateForm({
      plantationId: 'plant-uuid',
      weight: '42.5',
      news: 'good day',
      photos: 'http://a.jpg\n  http://b.jpg  \n\n',
    });
    fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));

    await waitFor(() => {
      expect(harvestService.create).toHaveBeenCalledWith({
        plantationId: 'plant-uuid',
        weight: 42.5,
        news: 'good day',
        photos: ['http://a.jpg', 'http://b.jpg'],
      });
    });
    await waitFor(() => {
      expect((harvestService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    // form closed, button label switches back
    expect(screen.getByRole('button', { name: /\+ log harvest/i })).toBeInTheDocument();
  });

  it('shows create error from Error', async () => {
    (harvestService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (harvestService.create as jest.Mock).mockRejectedValue('bad');
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));
    expect(await screen.findByText('Failed to create harvest')).toBeInTheDocument();
  });

  it('updates status as REJECTED with reason', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);

    fireEvent.change(screen.getByPlaceholderText('Harvest log UUID'), { target: { value: 'h-9' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
    fireEvent.change(screen.getByPlaceholderText('Rejection reason'), { target: { value: 'low quality' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));

    await waitFor(() => {
      expect(harvestService.updateStatus).toHaveBeenCalledWith({
        id: 'h-9',
        status: 'REJECTED',
        rejectionReason: 'low quality',
      });
    });
  });

  it('updates status as REJECTED with undefined reason when blank', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);

    fireEvent.change(screen.getByPlaceholderText('Harvest log UUID'), { target: { value: 'h-10' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));

    await waitFor(() => {
      expect(harvestService.updateStatus).toHaveBeenCalledWith({
        id: 'h-10',
        status: 'REJECTED',
        rejectionReason: undefined,
      });
    });
  });

  it('updates status as APPROVED with undefined rejection reason regardless of input', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);

    fireEvent.change(screen.getByPlaceholderText('Harvest log UUID'), { target: { value: 'h-11' } });
    fireEvent.change(screen.getByPlaceholderText('Rejection reason'), { target: { value: 'should be ignored' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));

    await waitFor(() => {
      expect(harvestService.updateStatus).toHaveBeenCalledWith({
        id: 'h-11',
        status: 'APPROVED',
        rejectionReason: undefined,
      });
    });
  });

  it('shows status update error from Error', async () => {
    (harvestService.updateStatus as jest.Mock).mockRejectedValue(new Error('Status failed'));
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);
    fireEvent.change(screen.getByPlaceholderText('Harvest log UUID'), { target: { value: 'h-err' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));
    expect(await screen.findByText('Status failed')).toBeInTheDocument();
  });

  it('shows fallback status update error when thrown value is not Error', async () => {
    (harvestService.updateStatus as jest.Mock).mockRejectedValue('boom');
    render(<HarvestsPage />);
    await screen.findByText(/no harvest data/i);
    fireEvent.change(screen.getByPlaceholderText('Harvest log UUID'), { target: { value: 'h-err' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));
    expect(await screen.findByText('Failed to update harvest status')).toBeInTheDocument();
  });
});
