jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    statusText: string;
    headers: Headers;
    private body: ArrayBuffer | string | null;

    constructor(body?: ArrayBuffer | string | null, init?: ResponseInit) {
      this.body = body ?? null;
      this.status = init?.status ?? 200;
      this.statusText = init?.statusText ?? '';
      this.headers = new Headers(init?.headers);
    }

    static json(body: unknown, init?: ResponseInit) {
      const response = new MockNextResponse(JSON.stringify(body), init);
      response.headers.set('content-type', 'application/json');
      return response;
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }

      if (this.body) {
        return JSON.parse(Buffer.from(this.body).toString('utf8'));
      }

      return null;
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

import { DELETE, GET, POST } from './route';

const encodeBody = (body?: string): ArrayBuffer =>
  (() => {
    if (!body) return new ArrayBuffer(0);

    const buffer = Buffer.from(body);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  })();

const makeUpstreamResponse = (
  body: unknown,
  init: {
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
  } = {}
) =>
  ({
    status: init.status ?? 200,
    statusText: init.statusText ?? '',
    headers: new Headers(init.headers),
    arrayBuffer: jest.fn().mockResolvedValue(encodeBody(JSON.stringify(body))),
  }) as unknown as Response;

const makeRequest = (
  url: string,
  init: {
    method?: string;
    headers?: HeadersInit;
    body?: string;
  } = {}
) =>
  ({
    method: init.method ?? 'GET',
    headers: new Headers(init.headers),
    nextUrl: new URL(url),
    arrayBuffer: jest.fn().mockResolvedValue(encodeBody(init.body)),
  }) as unknown as Parameters<typeof GET>[0];

describe('gateway route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('proxies GET requests to the selected service with query params', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeUpstreamResponse({ ok: true }, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await GET(
      makeRequest('http://localhost/api/gateway/harvest/harvests?status=PENDING'),
      { params: { service: 'harvest', path: ['harvests'] } }
    );

    const [targetUrl, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];

    expect(targetUrl.pathname).toBe('/harvests');
    expect(targetUrl.search).toBe('?status=PENDING');
    expect(init).toEqual(expect.objectContaining({
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns 404 for unknown services', async () => {
    const response = await GET(
      makeRequest('http://localhost/api/gateway/unknown/path'),
      { params: { service: 'unknown', path: ['path'] } }
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: 'Unknown gateway service: unknown',
    });
  });

  it('proxies POST requests with allowed headers and body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      makeUpstreamResponse({ id: 1 }, { status: 201 })
    );

    const response = await POST(
      makeRequest('http://localhost/api/gateway/identity/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
        headers: {
          authorization: 'Bearer token',
          connection: 'keep-alive',
          'content-type': 'application/json',
        },
      }),
      { params: { service: 'identity', path: ['api', 'auth', 'login'] } }
    );

    const [targetUrl, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;

    expect(targetUrl.pathname).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(init.body).toHaveProperty(
      'byteLength',
      JSON.stringify({ email: 'user@example.com' }).length
    );
    expect(headers.get('authorization')).toBe('Bearer token');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('connection')).toBeNull();
    expect(response.status).toBe(201);
  });

  it('returns 502 when the upstream request fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('upstream down'));

    const response = await DELETE(
      makeRequest('http://localhost/api/gateway/shipment/api/shipments/1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ service: 'shipment', path: ['api', 'shipments', '1'] }) }
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Gateway request failed',
      message: 'upstream down',
      service: 'shipment',
    });
  });
});
