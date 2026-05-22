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

    expect(screen.getByRole('heading', { name: /manajemen kebun sawit modern/i })).toBeInTheDocument();
    expect(screen.getByText(/platform terintegrasi/i)).toBeInTheDocument();
  });

  it('renders login and register links', () => {
    render(<Home />);

    expect(screen.getByRole('link', { name: /^login$/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /^register$/i })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('link', { name: /masuk ke dashboard/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /daftar akun baru/i })).not.toBeInTheDocument();
  });

  it('does not render decorative role, version, or module badges', () => {
    render(<Home />);

    expect(screen.queryByText(/mysawit platform v2\.0/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^BURUH$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Plantations$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Harvest$/i)).not.toBeInTheDocument();
  });
});
