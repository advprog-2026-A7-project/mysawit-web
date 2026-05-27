import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminUsersPage from './page';
import { adminService } from '@/services/admin.service';
import { useAuth } from '@/contexts/auth-context';

jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/admin.service', () => ({
  adminService: {
    getUsers: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

describe('Admin users negative guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    (adminService.getUsers as jest.Mock).mockResolvedValue([
      {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.test',
        name: 'Admin Test',
        role: 'ADMIN',
        hasPassword: true,
        googleLinked: false,
        createdAt: '2026-05-26T00:00:00',
      },
      {
        id: 'buruh-1',
        username: 'buruh',
        email: 'buruh@example.test',
        name: 'Buruh Test',
        role: 'BURUH',
        hasPassword: true,
        googleLinked: false,
        createdAt: '2026-05-26T00:00:00',
      },
    ]);
    (adminService.deleteUser as jest.Mock).mockResolvedValue({ message: 'deleted' });
  });

  it('does not render a delete action for the logged-in admin', async () => {
    render(<AdminUsersPage />);

    await screen.findByText('Admin Test');

    const adminRow = screen.getByText('Admin Test').closest('tr')!;
    const buruhRow = screen.getByText('Buruh Test').closest('tr')!;

    expect(adminRow).not.toHaveTextContent('Hapus');
    expect(buruhRow).toHaveTextContent('Hapus');
  });

  it('deletes a different user only after confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AdminUsersPage />);

    await screen.findByText('Buruh Test');
    const buruhRow = screen.getByText('Buruh Test').closest('tr')!;
    fireEvent.click(within(buruhRow).getByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(adminService.deleteUser).toHaveBeenCalledWith('buruh-1');
    });
  });
});
