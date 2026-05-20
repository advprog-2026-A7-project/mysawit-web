import { render, screen, waitFor } from '@testing-library/react';
import HarvestsLayout from './layout';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { user: { role: string } | null } = { user: { role: 'MANDOR' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('HarvestsLayout', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: { role: 'MANDOR' } };
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true } as Response) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders children for MANDOR when the harvest service is online', async () => {
    render(
      <HarvestsLayout>
        <p>harvest content</p>
      </HarvestsLayout>,
    );
    await waitFor(() => expect(screen.getByText('harvest content')).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('renders children for BURUH', async () => {
    mockAuth = { user: { role: 'BURUH' } };
    render(
      <HarvestsLayout>
        <p>harvest content</p>
      </HarvestsLayout>,
    );
    await waitFor(() => expect(screen.getByText('harvest content')).toBeInTheDocument());
  });

  it('redirects ADMIN (not in allow list) to /dashboard', () => {
    mockAuth = { user: { role: 'ADMIN' } };
    render(
      <HarvestsLayout>
        <p>harvest content</p>
      </HarvestsLayout>,
    );
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
