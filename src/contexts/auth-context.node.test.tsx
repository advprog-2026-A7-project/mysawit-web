/** @jest-environment node */

import { renderToStaticMarkup } from 'react-dom/server';
import { AuthProvider } from './auth-context';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/services/auth.service', () => ({
  authService: {
    isAuthenticated: jest.fn(() => false),
    getUserInfo: jest.fn(() => null),
    logout: jest.fn(),
  },
}));

describe('AuthProvider (server rendering)', () => {
  it('renders to static markup without throwing — getServerSnapshot returns null on the server', () => {
    expect(() =>
      renderToStaticMarkup(
        <AuthProvider>
          <p>child</p>
        </AuthProvider>,
      ),
    ).not.toThrow();
  });
});
