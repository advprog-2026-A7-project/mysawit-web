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

  it('returns 502 with generic message when failure value is not an Error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue('weird');

    const response = await DELETE(
      makeRequest('http://localhost/api/gateway/shipment/api/shipments/1', {
        method: 'DELETE',
      }),
      { params: { service: 'shipment', path: ['api', 'shipments', '1'] } }
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'Gateway request failed',
      message: 'Service unavailable',
      service: 'shipment',
    });
  });

  it('proxies an empty path correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(makeUpstreamResponse({}, { status: 204 }));
    await GET(
      makeRequest('http://localhost/api/gateway/payroll/'),
      { params: { service: 'payroll' } }
    );
    const [targetUrl] = (global.fetch as jest.Mock).mock.calls[0] as [URL];
    expect(targetUrl.pathname).toBe('/');
  });

  it('respects a base URL that already ends with a trailing slash', async () => {
    const previous = process.env.HARVEST_SERVICE_URL;
    process.env.HARVEST_SERVICE_URL = 'http://harvest.example/';
    jest.resetModules();
    const { GET: GetWithEnv } = await import('./route');
    (global.fetch as jest.Mock).mockResolvedValue(makeUpstreamResponse({}, { status: 200 }));
    await GetWithEnv(
      makeRequest('http://localhost/api/gateway/harvest/harvests'),
      { params: { service: 'harvest', path: ['harvests'] } }
    );
    const [targetUrl] = (global.fetch as jest.Mock).mock.calls[0] as [URL];
    expect(targetUrl.toString()).toBe('http://harvest.example/harvests');
    if (previous === undefined) {
      delete process.env.HARVEST_SERVICE_URL;
    } else {
      process.env.HARVEST_SERVICE_URL = previous;
    }
  });
});

describe('gateway route serviceBaseUrls env branches', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  const setupRoute = async () => {
    global.fetch = jest.fn().mockResolvedValue(
      ({
        status: 200,
        statusText: '',
        headers: new Headers(),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      }) as unknown as Response
    );
    return import('./route');
  };

  it('uses primary *_SERVICE_URL env vars when set', async () => {
    process.env.IDENTITY_SERVICE_URL = 'http://identity.test:9000';
    process.env.PLANTATION_SERVICE_URL = 'http://plantation.test:9000';
    process.env.HARVEST_SERVICE_URL = 'http://harvest.test:9000';
    process.env.SHIPMENT_SERVICE_URL = 'http://shipment.test:9000';
    process.env.PAYROLL_SERVICE_URL = 'http://payroll.test:9000';
    jest.resetModules();
    const { GET } = await setupRoute();

    const services: Array<[string, string]> = [
      ['identity', 'http://identity.test:9000/'],
      ['plantation', 'http://plantation.test:9000/'],
      ['harvest', 'http://harvest.test:9000/'],
      ['shipment', 'http://shipment.test:9000/'],
      ['payroll', 'http://payroll.test:9000/'],
    ];

    for (const [service, expectedOrigin] of services) {
      (global.fetch as jest.Mock).mockClear();
      await GET(
        ({
          method: 'GET',
          headers: new Headers(),
          nextUrl: new URL(`http://localhost/api/gateway/${service}/x`),
          arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
        }) as unknown as Parameters<typeof GET>[0],
        { params: { service, path: ['x'] } }
      );
      const [targetUrl] = (global.fetch as jest.Mock).mock.calls[0] as [URL];
      expect(targetUrl.toString()).toBe(`${expectedOrigin}x`);
    }
  });

  it('falls back to localhost defaults when neither primary nor NEXT_PUBLIC env vars are set', async () => {
    delete process.env.IDENTITY_SERVICE_URL;
    delete process.env.PLANTATION_SERVICE_URL;
    delete process.env.HARVEST_SERVICE_URL;
    delete process.env.SHIPMENT_SERVICE_URL;
    delete process.env.PAYROLL_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_PLANTATION_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_HARVEST_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_SHIPMENT_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_PAYROLL_SERVICE_URL;
    jest.resetModules();
    const { GET } = await setupRoute();

    const expectations: Array<[string, string]> = [
      ['identity', 'http://localhost:8081'],
      ['plantation', 'http://localhost:8082'],
      ['harvest', 'http://localhost:8083'],
      ['shipment', 'http://localhost:8084'],
      ['payroll', 'http://localhost:8085'],
    ];

    for (const [service, expectedOrigin] of expectations) {
      (global.fetch as jest.Mock).mockClear();
      await GET(
        ({
          method: 'GET',
          headers: new Headers(),
          nextUrl: new URL(`http://localhost/api/gateway/${service}/x`),
          arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
        }) as unknown as Parameters<typeof GET>[0],
        { params: { service, path: ['x'] } }
      );
      const [targetUrl] = (global.fetch as jest.Mock).mock.calls[0] as [URL];
      expect(targetUrl.origin).toBe(expectedOrigin);
    }
  });

  it('falls back to NEXT_PUBLIC_*_SERVICE_URL when primary is missing', async () => {
    delete process.env.IDENTITY_SERVICE_URL;
    delete process.env.PLANTATION_SERVICE_URL;
    delete process.env.HARVEST_SERVICE_URL;
    delete process.env.SHIPMENT_SERVICE_URL;
    delete process.env.PAYROLL_SERVICE_URL;
    process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL = 'http://id-pub:9000';
    process.env.NEXT_PUBLIC_PLANTATION_SERVICE_URL = 'http://pl-pub:9000';
    process.env.NEXT_PUBLIC_HARVEST_SERVICE_URL = 'http://hv-pub:9000';
    process.env.NEXT_PUBLIC_SHIPMENT_SERVICE_URL = 'http://sh-pub:9000';
    process.env.NEXT_PUBLIC_PAYROLL_SERVICE_URL = 'http://pa-pub:9000';
    jest.resetModules();
    const { GET } = await setupRoute();

    await GET(
      ({
        method: 'GET',
        headers: new Headers(),
        nextUrl: new URL('http://localhost/api/gateway/identity/x'),
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
      }) as unknown as Parameters<typeof GET>[0],
      { params: { service: 'identity', path: ['x'] } }
    );
    const [targetUrl] = (global.fetch as jest.Mock).mock.calls[0] as [URL];
    expect(targetUrl.origin).toBe('http://id-pub:9000');
  });
});
