import { render, screen, waitFor } from '@testing-library/react';
import ShipmentsLayout from './layout';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { user: { role: string } | null } = { user: { role: 'ADMIN' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('ShipmentsLayout', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: { role: 'ADMIN' } };
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true } as Response) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders children for ADMIN/MANDOR/SUPIR when the shipment service is online', async () => {
    render(
      <ShipmentsLayout>
        <p>shipments content</p>
      </ShipmentsLayout>,
    );
    await waitFor(() => expect(screen.getByText('shipments content')).toBeInTheDocument());
  });

  it('renders children for SUPIR', async () => {
    mockAuth = { user: { role: 'SUPIR' } };
    render(
      <ShipmentsLayout>
        <p>shipments content</p>
      </ShipmentsLayout>,
    );
    await waitFor(() => expect(screen.getByText('shipments content')).toBeInTheDocument());
  });

  it('redirects BURUH (not in allow list) to /dashboard', () => {
    mockAuth = { user: { role: 'BURUH' } };
    render(
      <ShipmentsLayout>
        <p>shipments content</p>
      </ShipmentsLayout>,
    );
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
