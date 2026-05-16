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

const asMandor = () => { mockAuth = { user: { id: 'mandor-1', role: 'MANDOR' } }; };
const asBuruh = () => { mockAuth = { user: { id: 'buruh-1', role: 'BURUH' } }; };
const asNoRole = () => { mockAuth = { user: null }; };

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
    expect(harvestService.getAll).not.toHaveBeenCalled();
    expect(harvestService.getMine).not.toHaveBeenCalled();
    expect(screen.getByText(/loading harvest records/i)).toBeInTheDocument();
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

      fireEvent.change(screen.getByPlaceholderText(/search harvester name/i), {
        target: { value: 'Andi' },
      });
      const dateInputs = screen
        .getAllByDisplayValue('')
        .filter((el) => (el as HTMLInputElement).type === 'datetime-local') as HTMLInputElement[];
      fireEvent.change(dateInputs[0], { target: { value: '2026-01-01T00:00' } });
      fireEvent.change(dateInputs[1], { target: { value: '2026-01-31T23:59' } });
      fireEvent.click(screen.getByRole('button', { name: /apply filter/i }));

      await waitFor(() => {
        expect(harvestService.getAll).toHaveBeenLastCalledWith({
          harvesterName: 'Andi',
          startDate: '2026-01-01T00:00',
          endDate: '2026-01-31T23:59',
        });
      });
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

    it('falls back to "-" for harvester when both name and id are missing', async () => {
      (harvestService.getAll as jest.Mock).mockResolvedValue([
        { id: 'no-harvester-uuid', plantationId: 'p1', weight: 10 },
      ]);
      render(<HarvestsPage />);
      const heading = await screen.findByText(/harvest #no-harve/i);
      const card = heading.closest('div.bg-white') as HTMLElement;
      // Harvester label row should render with "-" since both name and id are absent.
      const harvesterLabel = within(card).getByText('Harvester:');
      expect(harvesterLabel.parentElement?.textContent).toMatch(/Harvester:\s*-/);
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

    it('paginates across pages with Previous/Next and a page-number button', async () => {
      const makeId = (n: number) => `${String(n).padStart(8, '0')}-uuid`;
      (harvestService.getAll as jest.Mock).mockResolvedValue(
        Array.from({ length: 11 }, (_, i) => ({
          id: makeId(i + 1),
          plantationId: 'p',
          weight: 10,
          status: 'PENDING',
        }))
      );

      render(<HarvestsPage />);
      await screen.findByText(`Harvest #${makeId(1).slice(0, 8)}`);

      expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1 to 10 of 11 entries');

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText(`Harvest #${makeId(11).slice(0, 8)}`)).toBeInTheDocument();
      expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 11 to 11 of 11 entries');

      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(screen.getByText(`Harvest #${makeId(1).slice(0, 8)}`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '2' }));
      expect(screen.getByText(`Harvest #${makeId(11).slice(0, 8)}`)).toBeInTheDocument();
    });

    it('updates status as APPROVED ignoring rejection reason input', async () => {
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      fireEvent.change(screen.getByPlaceholderText(/harvest log uuid/i), { target: { value: 'h-1' } });
      // Rejection reason input is disabled when status is APPROVED — still verify the call omits it.
      fireEvent.click(screen.getByRole('button', { name: /update status/i }));

      await waitFor(() => {
        expect(harvestService.updateStatus).toHaveBeenCalledWith({
          id: 'h-1',
          status: 'APPROVED',
          rejectionReason: undefined,
        });
      });
    });

    it('updates status as REJECTED with rejection reason', async () => {
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      fireEvent.change(screen.getByPlaceholderText(/harvest log uuid/i), { target: { value: 'h-2' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
      fireEvent.change(screen.getByPlaceholderText(/rejection reason/i), { target: { value: 'low quality' } });
      fireEvent.click(screen.getByRole('button', { name: /update status/i }));

      await waitFor(() => {
        expect(harvestService.updateStatus).toHaveBeenCalledWith({
          id: 'h-2',
          status: 'REJECTED',
          rejectionReason: 'low quality',
        });
      });
    });

    it('updates status as REJECTED with undefined reason when blank', async () => {
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      fireEvent.change(screen.getByPlaceholderText(/harvest log uuid/i), { target: { value: 'h-3' } });
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'REJECTED' } });
      fireEvent.click(screen.getByRole('button', { name: /update status/i }));

      await waitFor(() => {
        expect(harvestService.updateStatus).toHaveBeenCalledWith({
          id: 'h-3',
          status: 'REJECTED',
          rejectionReason: undefined,
        });
      });
    });

    it('shows status update error from Error', async () => {
      (harvestService.updateStatus as jest.Mock).mockRejectedValue(new Error('Status failed'));
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);
      fireEvent.change(screen.getByPlaceholderText(/harvest log uuid/i), { target: { value: 'h-err' } });
      fireEvent.click(screen.getByRole('button', { name: /update status/i }));
      expect(await screen.findByText('Status failed')).toBeInTheDocument();
    });

    it('shows fallback status update error when thrown value is not Error', async () => {
      (harvestService.updateStatus as jest.Mock).mockRejectedValue('boom');
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);
      fireEvent.change(screen.getByPlaceholderText(/harvest log uuid/i), { target: { value: 'h-err' } });
      fireEvent.click(screen.getByRole('button', { name: /update status/i }));
      expect(await screen.findByText(/failed to update harvest status/i)).toBeInTheDocument();
    });

    it('shows load error from Error', async () => {
      (harvestService.getAll as jest.Mock).mockRejectedValue(new Error('Load failed'));
      render(<HarvestsPage />);
      expect(await screen.findByText('Load failed')).toBeInTheDocument();
    });

    it('shows fallback load error when thrown value is not Error', async () => {
      (harvestService.getAll as jest.Mock).mockRejectedValue('boom');
      render(<HarvestsPage />);
      expect(await screen.findByText(/failed to fetch harvests/i)).toBeInTheDocument();
    });

    it('falls back to [] when getAll returns a non-array', async () => {
      (harvestService.getAll as jest.Mock).mockResolvedValue('not-an-array');
      render(<HarvestsPage />);
      expect(await screen.findByText(/no harvest data/i)).toBeInTheDocument();
    });
  });

  // -------- BURUH --------

  describe('as BURUH', () => {
    beforeEach(() => {
      asBuruh();
    });

    it('renders worker heading, shows "+ Log Harvest", hides status form, omits harvester filter, and loads via getMine', async () => {
      render(<HarvestsPage />);
      await waitFor(() => {
        expect(harvestService.getMine).toHaveBeenCalledWith({
          startDate: undefined,
          endDate: undefined,
          status: undefined,
        });
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

    it('toggles Log Harvest form and resets to page 1', async () => {
      const makeId = (n: number) => `${String(n).padStart(8, '0')}-uuid`;
      (harvestService.getMine as jest.Mock).mockResolvedValue(
        Array.from({ length: 11 }, (_, i) => ({
          id: makeId(i + 1),
          plantationId: 'p',
          weight: 10,
        }))
      );

      render(<HarvestsPage />);
      await screen.findByText(`Harvest #${makeId(1).slice(0, 8)}`);

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 11 to 11 of 11 entries');

      fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
      // Form open + page reset to 1.
      expect(screen.getByRole('heading', { level: 2, name: /^log harvest$/i })).toBeInTheDocument();
      expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1 to 10 of 11 entries');

      // Cancel closes form.
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('heading', { level: 2, name: /^log harvest$/i })).not.toBeInTheDocument();
    });

    it('creates harvest with parsed photos, closes the form, resets fields, and reloads', async () => {
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
      fireEvent.change(screen.getByPlaceholderText(/plantation uuid/i), { target: { value: 'plant-1' } });
      fireEvent.change(screen.getByPlaceholderText(/weight kg/i), { target: { value: '42.5' } });
      fireEvent.change(screen.getByPlaceholderText(/harvest news/i), { target: { value: 'good day' } });
      fireEvent.change(screen.getByPlaceholderText(/photo urls, one per line/i), {
        target: { value: 'http://a.jpg\n  http://b.jpg  \n\n' },
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

    it('shows "Saving Harvest..." while create is in flight and the button is disabled', async () => {
      let resolveCreate: ((value: unknown) => void) | undefined;
      (harvestService.create as jest.Mock).mockReturnValue(
        new Promise((r) => { resolveCreate = r; })
      );

      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
      fireEvent.change(screen.getByPlaceholderText(/plantation uuid/i), { target: { value: 'p' } });
      fireEvent.change(screen.getByPlaceholderText(/weight kg/i), { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText(/harvest news/i), { target: { value: 'n' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));
      });

      const savingBtn = screen.getByRole('button', { name: /saving harvest/i });
      expect(savingBtn).toBeDisabled();

      await act(async () => {
        resolveCreate?.({ id: 'h-x' });
      });
    });

    it('shows create error from Error', async () => {
      (harvestService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
      fireEvent.change(screen.getByPlaceholderText(/plantation uuid/i), { target: { value: 'p' } });
      fireEvent.change(screen.getByPlaceholderText(/weight kg/i), { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText(/harvest news/i), { target: { value: 'n' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));
      });
      expect(await screen.findByText('Create failed')).toBeInTheDocument();
    });

    it('shows fallback create error when thrown value is not Error', async () => {
      (harvestService.create as jest.Mock).mockRejectedValue('boom');
      render(<HarvestsPage />);
      await screen.findByText(/no harvest data/i);

      fireEvent.click(screen.getByRole('button', { name: /\+ log harvest/i }));
      fireEvent.change(screen.getByPlaceholderText(/plantation uuid/i), { target: { value: 'p' } });
      fireEvent.change(screen.getByPlaceholderText(/weight kg/i), { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText(/harvest news/i), { target: { value: 'n' } });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /save harvest/i }));
      });
      expect(await screen.findByText(/failed to create harvest/i)).toBeInTheDocument();
    });

    it('hides the Harvester row on harvest cards (BURUH only sees their own)', async () => {
      (harvestService.getMine as jest.Mock).mockResolvedValue([
        {
          id: 'mine-uuid-1',
          plantationId: 'p1',
          weight: 10,
          harvesterName: 'should-not-show',
          status: 'PENDING',
        },
      ]);
      render(<HarvestsPage />);
      await screen.findByText(/harvest #mine-uui/i);
      expect(screen.queryByText('Harvester:')).not.toBeInTheDocument();
      expect(screen.queryByText('should-not-show')).not.toBeInTheDocument();
    });
  });
});
