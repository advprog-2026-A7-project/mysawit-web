import { render, screen, waitFor } from '@testing-library/react';
import IdentityLayout from './layout';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { user: { role: string } | null } = { user: { role: 'ADMIN' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('IdentityLayout', () => {
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

  it('renders children for ADMIN when the identity service is online', async () => {
    render(
      <IdentityLayout>
        <p>identity content</p>
      </IdentityLayout>,
    );
    await waitFor(() => expect(screen.getByText('identity content')).toBeInTheDocument());
  });

  it('redirects non-ADMIN users to /dashboard', () => {
    mockAuth = { user: { role: 'MANDOR' } };
    render(
      <IdentityLayout>
        <p>identity content</p>
      </IdentityLayout>,
    );
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
