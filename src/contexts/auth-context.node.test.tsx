/** @jest-environment node */

import { renderToStaticMarkup } from 'react-dom/server';
import { AuthProvider } from './auth-context';

const pushMock = jest.fn();
let lastSnapshot: unknown;

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

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useSyncExternalStore: (
      _subscribe: () => () => void,
      getSnapshot: () => unknown,
      getServerSnapshot: () => unknown,
    ) => {
      lastSnapshot = getSnapshot();
      return getServerSnapshot();
    },
  };
});

describe('AuthProvider (server rendering)', () => {
  it('renders to static markup without throwing and buildUser returns null when window is undefined', () => {
    expect(() =>
      renderToStaticMarkup(
        <AuthProvider>
          <p>child</p>
        </AuthProvider>,
      ),
    ).not.toThrow();

    expect(lastSnapshot).toBeNull();
  });
});
