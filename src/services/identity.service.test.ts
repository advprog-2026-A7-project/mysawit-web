import { identityService } from './identity.service';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/api-config';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('identity.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createDummyUser posts to register endpoint', async () => {
    const request = {
      username: 'dummyuser',
      email: 'dummy@mysawit.local',
      password: 'dummy123',
    };
    const payload = {
      token: 'token',
      type: 'Bearer',
      id: 9,
      username: 'dummyuser',
      email: 'dummy@mysawit.local',
      role: 'USER',
    };
    (apiClient.post as jest.Mock).mockResolvedValue(payload);

    const result = await identityService.createDummyUser(request);

    expect(apiClient.post).toHaveBeenCalledWith(API_ENDPOINTS.AUTH.REGISTER, request);
    expect(result).toEqual(payload);
  });

  it('listUsers without filters omits query string', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await identityService.listUsers();
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.USERS);
  });

  it('listUsers builds query string for each provided filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await identityService.listUsers({ name: 'Budi', email: 'budi@x.com', role: 'BURUH' });
    expect(apiClient.get).toHaveBeenCalledWith(
      `${API_ENDPOINTS.IDENTITY.USERS}?name=Budi&email=budi%40x.com&role=BURUH`
    );
  });

  it('listUsers ignores blank role', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    await identityService.listUsers({ name: 'X', role: '' });
    expect(apiClient.get).toHaveBeenCalledWith(`${API_ENDPOINTS.IDENTITY.USERS}?name=X`);
  });

  it('getUser hits user-by-id endpoint', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ id: 'u-1' });
    const result = await identityService.getUser('u-1');
    expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.USER_BY_ID('u-1'));
    expect(result).toEqual({ id: 'u-1' });
  });

  it('assignMandor puts to assign-mandor endpoint', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({ message: 'ok' });
    const result = await identityService.assignMandor('b-1', { mandorId: 'm-1' });
    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.ASSIGN_MANDOR('b-1'), { mandorId: 'm-1' });
    expect(result).toEqual({ message: 'ok' });
  });

  it('unassignMandor puts empty body to unassign endpoint', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({ message: 'ok' });
    const result = await identityService.unassignMandor('b-1');
    expect(apiClient.put).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.UNASSIGN_MANDOR('b-1'), {});
    expect(result).toEqual({ message: 'ok' });
  });

  it('deleteUser calls delete on user-by-id endpoint', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({ message: 'gone' });
    const result = await identityService.deleteUser('u-1');
    expect(apiClient.delete).toHaveBeenCalledWith(API_ENDPOINTS.IDENTITY.USER_BY_ID('u-1'));
    expect(result).toEqual({ message: 'gone' });
  });
});
