import { render, screen, waitFor } from '@testing-library/react';
import PayrollLayout from './layout';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

let mockAuth: { user: { role: string } | null } = { user: { role: 'ADMIN' } };

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockAuth,
}));

describe('PayrollLayout', () => {
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

  it('renders children for ADMIN when the payroll service is online', async () => {
    render(
      <PayrollLayout>
        <p>payroll content</p>
      </PayrollLayout>,
    );
    await waitFor(() => expect(screen.getByText('payroll content')).toBeInTheDocument());
  });

  it('renders children for BURUH (payroll is open to all four roles)', async () => {
    mockAuth = { user: { role: 'BURUH' } };
    render(
      <PayrollLayout>
        <p>payroll content</p>
      </PayrollLayout>,
    );
    await waitFor(() => expect(screen.getByText('payroll content')).toBeInTheDocument());
  });

  it('shows access denied when there is no user', () => {
    mockAuth = { user: null };
    render(
      <PayrollLayout>
        <p>payroll content</p>
      </PayrollLayout>,
    );
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
