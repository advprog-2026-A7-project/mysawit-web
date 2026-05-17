import { render, screen, waitFor } from '@testing-library/react';
import PlantationsLayout from './layout';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { user: { role: string } | null } = { user: { role: 'ADMIN' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('PlantationsLayout', () => {
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

  it('renders children for ADMIN when the plantation service is online', async () => {
    render(
      <PlantationsLayout>
        <p>plantations content</p>
      </PlantationsLayout>,
    );
    await waitFor(() => expect(screen.getByText('plantations content')).toBeInTheDocument());
  });

  it('redirects non-ADMIN users to /dashboard', () => {
    mockAuth = { user: { role: 'BURUH' } };
    render(
      <PlantationsLayout>
        <p>plantations content</p>
      </PlantationsLayout>,
    );
    expect(pushMock).toHaveBeenCalledWith('/dashboard');
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
