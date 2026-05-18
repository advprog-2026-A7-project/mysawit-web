jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Headers;
    private body: string | null;

    constructor(body?: string | null, init?: ResponseInit) {
      this.body = body ?? null;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }

    static json(body: unknown, init?: ResponseInit) {
      const response = new MockNextResponse(JSON.stringify(body), init);
      response.headers.set('content-type', 'application/json');
      return response;
    }

    async json() {
      return this.body ? JSON.parse(this.body) : null;
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

import { POST } from './route';

const makeRequest = (body: unknown, rejectJson = false) =>
  ({
    json: jest.fn().mockImplementation(() => rejectJson ? Promise.reject(new Error('bad json')) : Promise.resolve(body)),
  }) as unknown as Parameters<typeof POST>[0];

const decodeJwtPayload = (token: string) => {
  const [, payload] = token.split('.');
  const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
};

describe('shipment dev token route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('returns 404 when dev auth is disabled', async () => {
    process.env.SHIPMENT_DEV_AUTH_ENABLED = 'false';

    const response = await POST(makeRequest({ role: 'SUPIR' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Shipment dev auth is disabled' });
  });

  it('returns 500 when the signing secret is missing or placeholder', async () => {
    process.env.SHIPMENT_DEV_AUTH_ENABLED = 'true';
    process.env.SHIPMENT_DEV_JWT_SECRET = 'PASTE_SAME_VALUE_AS_SHIPMENT_JWT_SECRET';

    const response = await POST(makeRequest({ role: 'SUPIR' }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'SHIPMENT_DEV_JWT_SECRET is not configured' });
  });

  it('returns 400 for unsupported roles', async () => {
    process.env.SHIPMENT_DEV_AUTH_ENABLED = 'true';
    process.env.SHIPMENT_DEV_JWT_SECRET = 'secret';

    const response = await POST(makeRequest({ role: 'BURUH' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unsupported shipment dev role' });
  });

  it('issues a signed token for a lowercase supir role', async () => {
    process.env.SHIPMENT_DEV_AUTH_ENABLED = 'true';
    process.env.SHIPMENT_DEV_JWT_SECRET = 'secret';

    const response = await POST(makeRequest({ role: 'supir' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({
      type: 'Bearer',
      id: 'bbbbbbbb-2222-2222-2222-222222222222',
      username: 'supir-local',
      email: 'supir-local@mysawit.test',
      role: 'SUPIR',
    }));
    expect(decodeJwtPayload(body.token)).toEqual({
      sub: 'bbbbbbbb-2222-2222-2222-222222222222',
      role: 'SUPIR',
      iat: 1_700_000_000,
      exp: 1_700_000_000 + 60 * 60 * 8,
    });
  });

  it('defaults to a mandor token when request JSON cannot be parsed', async () => {
    process.env.SHIPMENT_DEV_AUTH_ENABLED = 'true';
    process.env.SHIPMENT_DEV_JWT_SECRET = 'secret';

    const response = await POST(makeRequest({}, true));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.role).toBe('MANDOR');
    expect(decodeJwtPayload(body.token).sub).toBe('aaaaaaaa-1111-1111-1111-111111111111');
  });
});
