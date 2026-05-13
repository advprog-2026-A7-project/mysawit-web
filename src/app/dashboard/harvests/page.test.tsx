import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HarvestsPage from './page';
import { harvestService } from '@/services/harvest.service';
import { authService } from '@/services/auth.service';

const pushMock = jest.fn();
const routerMock = { push: pushMock };
const confirmMock = jest.fn();

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
    delete: jest.fn(),
  },
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(),
  },
}));

const fillForm = (container: HTMLElement, overrides: Partial<{ harvesterId: string; notes: string }> = {}) => {
  fireEvent.click(screen.getByRole('button', { name: /add harvest/i }));

  const numberInputs = container.querySelectorAll('input[type="number"]');
  fireEvent.change(numberInputs[0], { target: { value: '3' } });
  fireEvent.change(numberInputs[1], { target: { value: '120.5' } });
  if (overrides.harvesterId !== undefined) {
    fireEvent.change(numberInputs[2], { target: { value: overrides.harvesterId } });
  }

  const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
  fireEvent.change(dateInput, { target: { value: '2026-05-10' } });

  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'PREMIUM' } });

  if (overrides.notes !== undefined) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: overrides.notes } });
  }
};

describe('HarvestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as unknown as { confirm: typeof confirm }).confirm = confirmMock;
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (harvestService.getAll as jest.Mock).mockResolvedValue([]);
    (harvestService.create as jest.Mock).mockResolvedValue({ id: 1 });
    (harvestService.delete as jest.Mock).mockResolvedValue(undefined);
    confirmMock.mockReturnValue(true);
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
    expect(screen.getByText(/loading harvests/i)).toBeInTheDocument();
    resolvePromise?.([]);
    expect(await screen.findByText(/no harvests yet/i)).toBeInTheDocument();
  });

  it('renders harvests list with optional fields and varying quality colors', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, plantationId: 1, harvestDate: '2026-01-01', weight: 100, quality: 'PREMIUM', harvesterId: 5, notes: 'nice' },
      { id: 2, plantationId: 1, harvestDate: '2026-01-02', weight: 80, quality: 'STANDARD' },
      { id: 3, plantationId: 2, harvestDate: '2026-01-03', weight: 60, quality: 'LOW' },
    ]);
    render(<HarvestsPage />);
    expect(await screen.findByText('Harvest #1')).toBeInTheDocument();
    expect(screen.getByText(/nice/)).toBeInTheDocument();
    expect(screen.getByText('Harvest #2')).toBeInTheDocument();
    expect(screen.getByText('Harvest #3')).toBeInTheDocument();
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

  it('paginates harvests when more than ten records are returned', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        id: index + 1,
        plantationId: 1,
        harvestDate: '2026-01-01',
        weight: 100,
        quality: 'STANDARD',
      }))
    );

    render(<HarvestsPage />);

    expect(await screen.findByText('Harvest #1')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 10 of 11 entries');
    expect(screen.queryByText('Harvest #11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Harvest #11')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11 to 11 of 11 entries');

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(screen.getByText('Harvest #1')).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 10 of 11 entries');

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    expect(screen.getByText('Harvest #11')).toBeInTheDocument();
  });

  it('toggles add harvest form visibility', async () => {
    render(<HarvestsPage />);
    await screen.findByText(/no harvests yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add harvest/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /add harvest/i })).toBeInTheDocument();
  });

  it('creates harvest with optional fields populated', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const { container } = render(<HarvestsPage />);
    await screen.findByText(/no harvests yet/i);
    fillForm(container, { harvesterId: '7', notes: 'morning batch' });
    fireEvent.click(screen.getByRole('button', { name: /create harvest/i }));

    await waitFor(() => {
      expect(harvestService.create).toHaveBeenCalledWith({
        plantationId: 3,
        harvestDate: '2026-05-10',
        weight: 120.5,
        quality: 'PREMIUM',
        harvesterId: 7,
        notes: 'morning batch',
      });
    });
    await waitFor(() => {
      expect((harvestService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('creates harvest with undefined optional fields when blank', async () => {
    const { container } = render(<HarvestsPage />);
    await screen.findByText(/no harvests yet/i);
    fillForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create harvest/i }));

    await waitFor(() => {
      expect(harvestService.create).toHaveBeenCalledWith({
        plantationId: 3,
        harvestDate: '2026-05-10',
        weight: 120.5,
        quality: 'PREMIUM',
        harvesterId: undefined,
        notes: undefined,
      });
    });
  });

  it('creates harvest with zero numeric fallbacks when numeric inputs are blank', async () => {
    const { container } = render(<HarvestsPage />);
    await screen.findByText(/no harvests yet/i);
    fireEvent.click(screen.getByRole('button', { name: /add harvest/i }));

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(harvestService.create).toHaveBeenCalledWith({
        plantationId: 0,
        harvestDate: '',
        weight: 0,
        quality: 'STANDARD',
        harvesterId: undefined,
        notes: undefined,
      });
    });
  });

  it('shows create error from Error', async () => {
    (harvestService.create as jest.Mock).mockRejectedValue(new Error('Create failed'));
    const { container } = render(<HarvestsPage />);
    await screen.findByText(/no harvests yet/i);
    fillForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create harvest/i }));
    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('shows fallback create error when thrown value is not Error', async () => {
    (harvestService.create as jest.Mock).mockRejectedValue('bad');
    const { container } = render(<HarvestsPage />);
    await screen.findByText(/no harvests yet/i);
    fillForm(container);
    fireEvent.click(screen.getByRole('button', { name: /create harvest/i }));
    expect(await screen.findByText('Failed to create harvest')).toBeInTheDocument();
  });

  it('does not delete when confirm is cancelled', async () => {
    confirmMock.mockReturnValue(false);
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, plantationId: 1, harvestDate: '2026-01-01', weight: 100, quality: 'STANDARD' },
    ]);
    render(<HarvestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(harvestService.delete).not.toHaveBeenCalled();
  });

  it('deletes harvest and reloads list when confirmed', async () => {
    (harvestService.getAll as jest.Mock)
      .mockResolvedValueOnce([{ id: 1, plantationId: 1, harvestDate: '2026-01-01', weight: 100, quality: 'STANDARD' }])
      .mockResolvedValueOnce([]);
    render(<HarvestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => expect(harvestService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => {
      expect((harvestService.getAll as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows delete error from Error', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, plantationId: 1, harvestDate: '2026-01-01', weight: 100, quality: 'STANDARD' },
    ]);
    (harvestService.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));
    render(<HarvestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
  });

  it('shows fallback delete error when thrown value is not Error', async () => {
    (harvestService.getAll as jest.Mock).mockResolvedValue([
      { id: 1, plantationId: 1, harvestDate: '2026-01-01', weight: 100, quality: 'STANDARD' },
    ]);
    (harvestService.delete as jest.Mock).mockRejectedValue('bad');
    render(<HarvestsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(await screen.findByText('Failed to delete harvest')).toBeInTheDocument();
  });
});
