import { render, screen } from '@testing-library/react';
import Providers from './providers';

jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ clientId, children }: { clientId: string; children: React.ReactNode }) => (
    <div data-testid="oauth-provider" data-client-id={clientId}>
      {children}
    </div>
  ),
}));

describe('Providers', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalEnv;
  });

  it('passes NEXT_PUBLIC_GOOGLE_CLIENT_ID to GoogleOAuthProvider', () => {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'client-id-123';
    render(<Providers><span>child</span></Providers>);
    expect(screen.getByTestId('oauth-provider')).toHaveAttribute('data-client-id', 'client-id-123');
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('falls back to empty client id when env var is missing', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    render(<Providers><span>child</span></Providers>);
    expect(screen.getByTestId('oauth-provider')).toHaveAttribute('data-client-id', '');
  });
});
