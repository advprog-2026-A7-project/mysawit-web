import { apiClient } from './api-client';

const createJsonResponse = (ok: boolean, body: unknown) => ({
  ok,
  json: jest.fn().mockResolvedValue(body),
}) as unknown as Response;

describe('api-client (browser)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn();
  });

  it('adds auth header when token exists', async () => {
    localStorage.setItem('authToken', 'jwt-token');
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { ok: true }));

    const result = await apiClient.get<{ ok: boolean }>('/resource');

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith('/resource', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-token',
      },
    });
  });

  it('uses content type only when token does not exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { ok: true }));

    await apiClient.get<{ ok: boolean }>('/resource');

    expect(global.fetch).toHaveBeenCalledWith('/resource', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('post sends body and returns json', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { id: 1 }));

    const result = await apiClient.post<{ id: number }>('/resource', { name: 'test' });

    expect(result).toEqual({ id: 1 });
    expect(global.fetch).toHaveBeenCalledWith('/resource', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'test' }),
    });
  });

  it('put sends body and returns json', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { id: 2 }));

    const result = await apiClient.put<{ id: number }>('/resource/2', { name: 'updated' });

    expect(result).toEqual({ id: 2 });
    expect(global.fetch).toHaveBeenCalledWith('/resource/2', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'updated' }),
    });
  });

  it('delete returns json', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { message: 'deleted' }));

    const result = await apiClient.delete<{ message: string }>('/resource/2');

    expect(result).toEqual({ message: 'deleted' });
    expect(global.fetch).toHaveBeenCalledWith('/resource/2', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('throws API-provided error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(false, { error: 'bad request' }));

    await expect(apiClient.get('/resource')).rejects.toThrow('bad request');
  });

  it('throws fallback error for failed get request without error field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(false, { detail: 'missing field' }));

    await expect(apiClient.get('/resource')).rejects.toThrow('Request failed');
  });

  it('throws fallback error when error payload does not contain message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(false, { detail: 'oops' }));

    await expect(apiClient.post('/resource', {})).rejects.toThrow('Request failed');
  });

  it('throws error for failed put request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(false, { error: 'put failed' }));

    await expect(apiClient.put('/resource/2', {})).rejects.toThrow('put failed');
  });

  it('throws fallback error for failed put request without error field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(false, { detail: 'bad put' }));

    await expect(apiClient.put('/resource/2', {})).rejects.toThrow('Request failed');
  });

  it('throws fallback error for failed delete request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(false, { detail: 'delete failed' }));

    await expect(apiClient.delete('/resource/2')).rejects.toThrow('Request failed');
  });

  it('saves and clears auth data', () => {
    apiClient.saveAuth({
      token: 'jwt',
      type: 'Bearer',
      id: 10,
      username: 'user',
      email: 'user@mail.com',
      role: 'USER',
    });

    expect(localStorage.getItem('authToken')).toBe('jwt');
    expect(localStorage.getItem('userId')).toBe('10');
    expect(localStorage.getItem('username')).toBe('user');
    expect(localStorage.getItem('userRole')).toBe('USER');
    expect(apiClient.isAuthenticated()).toBe(true);
    expect(apiClient.getUserInfo()).toEqual({
      id: '10',
      username: 'user',
      role: 'USER',
    });

    apiClient.clearAuth();

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();
    expect(localStorage.getItem('userRole')).toBeNull();
    expect(apiClient.isAuthenticated()).toBe(false);
  });
});
