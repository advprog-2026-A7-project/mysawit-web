import { render, screen } from '@testing-library/react';
import Home from './page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Home page', () => {
  it('renders main heading and subtitle', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: /mysawit/i })).toBeInTheDocument();
    expect(screen.getByText(/palm oil management system/i)).toBeInTheDocument();
  });

  it('renders login and register links', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register');
  });

  it('renders all module cards', () => {
    render(<Home />);

    expect(screen.getByText(/^Plantations$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Harvest$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Shipment$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Payroll$/i)).toBeInTheDocument();
  });
});
