import { adminService } from './admin.service';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('admin.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getUsers without params calls the bare USERS endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([{ id: '1' }]);

    await adminService.getUsers();

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.USERS);
  });

  it('getUsers with search params appends a querystring', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    await adminService.getUsers({ name: 'Budi', email: 'b@mail.com', role: 'BURUH' });

    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.IDENTITY.USERS}?name=Budi&email=b%40mail.com&role=BURUH`
    );
  });

  it('getUsers with empty params object skips the querystring', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    await adminService.getUsers({});

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.USERS);
  });

  it('getUserById delegates to USER_BY_ID', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ id: '7' });

    await adminService.getUserById('7');

    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.USER_BY_ID('7'));
  });

  it('assignMandor PUTs to ASSIGN_MANDOR with the mandorId payload', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({ message: 'ok' });

    await adminService.assignMandor('buruh-1', 'mandor-7');

    expect(apiClient.put).toHaveBeenCalledWith(
      API_ENDPOINTS.IDENTITY.ASSIGN_MANDOR('buruh-1'),
      { mandorId: 'mandor-7' }
    );
  });

  it('unassignMandor PUTs to UNASSIGN_MANDOR with an empty body', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({ message: 'ok' });

    await adminService.unassignMandor('buruh-2');

    expect(apiClient.put).toHaveBeenCalledWith(
      API_ENDPOINTS.IDENTITY.UNASSIGN_MANDOR('buruh-2'),
      {}
    );
  });

  it('deleteUser DELETEs against USER_BY_ID', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({ message: 'gone' });

    await adminService.deleteUser('user-9');

    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.USER_BY_ID('user-9'));
  });
});
