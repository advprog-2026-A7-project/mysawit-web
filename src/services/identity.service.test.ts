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
});
