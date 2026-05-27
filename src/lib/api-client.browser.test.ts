import { apiClient } from './api-client';

const createJsonResponse = (ok: boolean, body: unknown, status = 200) => ({
  ok,
  status,
  headers: { get: jest.fn().mockReturnValue(null) },
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

  it('delete returns undefined for 204 No Content responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    const result = await apiClient.delete('/resource/1');

    expect(result).toBeUndefined();
  });

  it('delete returns undefined when content-length header is 0', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue('0') },
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    const result = await apiClient.delete('/resource/1');

    expect(result).toBeUndefined();
  });

  it('delete throws fallback error when response json cannot be parsed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockRejectedValue(new Error('not json')),
    } as unknown as Response);

    await expect(apiClient.delete('/resource/1')).rejects.toThrow('Request failed');
  });

  it('patch sends body and returns json', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { id: 3 }));

    const result = await apiClient.patch<{ id: number }>('/resource/3', { name: 'patched' });

    expect(result).toEqual({ id: 3 });
    expect(global.fetch).toHaveBeenCalledWith('/resource/3', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'patched' }),
    });
  });

  it('patch sends no body when data is undefined', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { id: 3 }));

    await apiClient.patch<{ id: number }>('/resource/3');

    expect(global.fetch).toHaveBeenCalledWith('/resource/3', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
    });
  });

  it('patch throws API-provided error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(false, { error: 'patch failed' }));

    await expect(apiClient.patch('/resource/3')).rejects.toThrow('patch failed');
  });

  it('patch throws fallback error when response json cannot be parsed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockRejectedValue(new Error('not json')),
    } as unknown as Response);

    await expect(apiClient.patch('/resource/3')).rejects.toThrow('Request failed');
  });

  it('attaches all user identity headers including BURUH harvester pair', async () => {
    localStorage.setItem('authToken', 'jwt');
    localStorage.setItem('userId', 'user-1');
    localStorage.setItem('username', 'budi');
    localStorage.setItem('userRole', 'BURUH');
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { ok: true }));

    await apiClient.get('/resource');

    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt',
      'X-User-Id': 'user-1',
      'X-Requester-Id': 'user-1',
      'X-User-Name': 'budi',
      'X-User-Role': 'BURUH',
      'X-Harvester-Id': 'user-1',
      'X-Harvester-Name': 'budi',
    });
  });

  it('attaches MANDOR foreman header when role is MANDOR', async () => {
    localStorage.setItem('userId', 'user-2');
    localStorage.setItem('userRole', 'MANDOR');
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { ok: true }));

    await apiClient.get('/resource');

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['X-Foreman-Id']).toBe('user-2');
    expect(headers['X-Harvester-Id']).toBeUndefined();
  });

  it('falls back to user id when BURUH username is missing', async () => {
    localStorage.setItem('userId', 'user-3');
    localStorage.setItem('userRole', 'BURUH');
    (global.fetch as jest.Mock).mockResolvedValue(createJsonResponse(true, { ok: true }));

    await apiClient.get('/resource');

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['X-Harvester-Name']).toBe('user-3');
    expect(headers['X-User-Name']).toBeUndefined();
  });

  it('parseResponse returns {} when text body is empty and headers signal nothing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue(null) },
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);

    const result = await apiClient.get<Record<string, unknown>>('/resource');
    expect(result).toEqual({});
  });

  it('parseResponse JSON-parses text when content-type is application/json', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockImplementation((name: string) => name === 'content-type' ? 'application/json; charset=utf-8' : null) },
      text: jest.fn().mockResolvedValue('{"hello":"world"}'),
    } as unknown as Response);

    const result = await apiClient.get<{ hello: string }>('/resource');
    expect(result).toEqual({ hello: 'world' });
  });

  it('parseResponse returns raw text when content-type is not json', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockImplementation((name: string) => name === 'content-type' ? 'text/plain' : null) },
      text: jest.fn().mockResolvedValue('hello world'),
    } as unknown as Response);

    const result = await apiClient.get<string>('/resource');
    expect(result).toBe('hello world');
  });

  it('parseError uses message from JSON text body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue('{"message":"something specific"}'),
    } as unknown as Response);

    await expect(apiClient.get('/resource')).rejects.toThrow('something specific');
  });

  it('parseError uses error field when message is absent', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue('{"error":"err-field"}'),
    } as unknown as Response);

    await expect(apiClient.get('/resource')).rejects.toThrow('err-field');
  });

  it('parseError falls back to statusText when text JSON has no message or error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue('{"detail":"x"}'),
    } as unknown as Response);

    await expect(apiClient.get('/resource')).rejects.toThrow('Bad Request');
  });

  it('parseError returns text body when JSON parsing throws', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: jest.fn().mockReturnValue('text/html') },
      text: jest.fn().mockResolvedValue('<html>boom</html>'),
    } as unknown as Response);

    await expect(apiClient.get('/resource')).rejects.toThrow('<html>boom</html>');
  });

  it('parseError falls back to statusText when text is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: { get: jest.fn().mockReturnValue(null) },
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(apiClient.get('/resource')).rejects.toThrow('Bad Gateway');
  });

  it('parseError uses generic message when statusText is also empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: '',
      headers: { get: jest.fn().mockReturnValue(null) },
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);

    await expect(apiClient.get('/resource')).rejects.toThrow('Request failed');
  });

  it('parseError falls back to "Request failed" when JSON body and statusText are both empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: '',
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue('{}'),
    } as unknown as Response);

    await expect(apiClient.get('/resource')).rejects.toThrow('Request failed');
  });

  it('saveAuth defaults googleLinked and hasPassword to "false" when omitted from the response', () => {
    apiClient.saveAuth({
      token: 'jwt',
      type: 'Bearer',
      id: '99',
      username: 'no-flags',
      email: 'nf@mail.com',
      role: 'BURUH',
    } as unknown as Parameters<typeof apiClient.saveAuth>[0]);

    expect(localStorage.getItem('googleLinked')).toBe('false');
    expect(localStorage.getItem('hasPassword')).toBe('false');
  });

  it('saveAuth persists refresh token when present', () => {
    apiClient.saveAuth({
      token: 'jwt',
      refreshToken: 'refresh-1',
      type: 'Bearer',
      id: '10',
      username: 'user',
      email: 'user@mail.com',
      role: 'BURUH',
      mandorId: 'mandor-1',
      googleLinked: false,
      hasPassword: false,
    });

    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    apiClient.clearAuth();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('saveAuth persists kebunId when present and clears it when absent', () => {
    apiClient.saveAuth({
      token: 'jwt',
      type: 'Bearer',
      id: '20',
      username: 'mandor',
      email: 'mandor@mail.com',
      role: 'MANDOR',
      kebunId: 'kebun-42',
      googleLinked: false,
      hasPassword: false,
    });

    expect(localStorage.getItem('kebunId')).toBe('kebun-42');

    apiClient.saveAuth({
      token: 'jwt',
      type: 'Bearer',
      id: '20',
      username: 'mandor',
      email: 'mandor@mail.com',
      role: 'MANDOR',
      googleLinked: false,
      hasPassword: false,
    });

    expect(localStorage.getItem('kebunId')).toBeNull();
  });

  describe('401 → refresh → retry', () => {
    const ok = (body: unknown) => ({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response);

    const unauthorized = () => ({
      ok: false,
      status: 401,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    it('refreshes the token and retries the original request on 401', async () => {
      localStorage.setItem('authToken', 'old-jwt');
      localStorage.setItem('refreshToken', 'r1');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(ok({
          token: 'new-jwt',
          refreshToken: 'r2',
          type: 'Bearer',
          id: '1',
          username: 'u',
          email: 'u@mail.com',
          role: 'BURUH',
          googleLinked: false,
          hasPassword: false,
        }))
        .mockResolvedValueOnce(ok({ data: 'retried' }));

      const result = await apiClient.get<{ data: string }>('/resource');

      expect(result).toEqual({ data: 'retried' });
      expect(localStorage.getItem('authToken')).toBe('new-jwt');
    });

    it('coalesces concurrent 401s into a single refresh call', async () => {
      localStorage.setItem('refreshToken', 'r1');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(ok({
          token: 'new', type: 'Bearer', id: '1', username: 'u', email: 'u@mail.com', role: 'BURUH', googleLinked: false, hasPassword: false,
        }))
        .mockResolvedValue(ok({ data: 'ok' }));

      await Promise.all([apiClient.get('/a'), apiClient.get('/b')]);

      const refreshCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) =>
        String(url).includes('/api/auth/refresh')
      );
      expect(refreshCalls).toHaveLength(1);
    });

    it('clears auth and throws when refresh response is not ok', async () => {
      localStorage.setItem('refreshToken', 'bad');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: { get: jest.fn().mockReturnValue(null) },
          json: jest.fn().mockResolvedValue({ error: 'refresh denied' }),
        } as unknown as Response);

      await expect(apiClient.get('/r')).rejects.toThrow();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('clears auth and throws when the refresh fetch itself rejects', async () => {
      localStorage.setItem('refreshToken', 'broken');

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(unauthorized())
        .mockRejectedValueOnce(new Error('network down'));

      await expect(apiClient.get('/r')).rejects.toThrow();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('throws without retry when there is no refresh token stored', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(unauthorized());

      await expect(apiClient.get('/r')).rejects.toThrow();
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      expect(fetchCalls.length).toBe(1);
    });
  });

  it('falls back to id when BURUH role is set but user id is missing', async () => {
    localStorage.setItem('userRole', 'BURUH');
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue(null) },
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response);

    await apiClient.get('/r');

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['X-Harvester-Id']).toBeUndefined();
    expect(headers['X-Foreman-Id']).toBeUndefined();
  });

  it('saves and clears auth data', () => {
    apiClient.saveAuth({
      token: 'jwt',
      type: 'Bearer',
      id: '10',
      username: 'user',
      email: 'user@mail.com',
      role: 'BURUH',
      mandorId: 'mandor-1',
      googleLinked: false,
      hasPassword: false,
    });

    expect(localStorage.getItem('authToken')).toBe('jwt');
    expect(localStorage.getItem('userId')).toBe('10');
    expect(localStorage.getItem('username')).toBe('user');
    expect(localStorage.getItem('userRole')).toBe('BURUH');
    expect(localStorage.getItem('mandorId')).toBe('mandor-1');
    expect(apiClient.isAuthenticated()).toBe(true);
    expect(apiClient.getUserInfo()).toEqual({
      id: '10',
      username: 'user',
      email: 'user@mail.com',
      role: 'BURUH',
      mandorId: 'mandor-1',
      kebunId: null,
      googleLinked: false,
      hasPassword: false,
    });

    apiClient.clearAuth();

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();
    expect(localStorage.getItem('userRole')).toBeNull();
    expect(localStorage.getItem('mandorId')).toBeNull();
    expect(apiClient.isAuthenticated()).toBe(false);
  });
});
