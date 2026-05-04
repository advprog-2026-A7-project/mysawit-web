import { NextRequest, NextResponse } from 'next/server';

interface GatewayParams {
  service: string;
  path?: string[];
}

interface GatewayContext {
  params: GatewayParams | Promise<GatewayParams>;
}

const serviceBaseUrls = {
  identity:
    process.env.IDENTITY_SERVICE_URL ??
    process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL ??
    'http://localhost:8081',
  plantation:
    process.env.PLANTATION_SERVICE_URL ??
    process.env.NEXT_PUBLIC_PLANTATION_SERVICE_URL ??
    'http://localhost:8082',
  harvest:
    process.env.HARVEST_SERVICE_URL ??
    process.env.NEXT_PUBLIC_HARVEST_SERVICE_URL ??
    'http://localhost:8083',
  shipment:
    process.env.SHIPMENT_SERVICE_URL ??
    process.env.NEXT_PUBLIC_SHIPMENT_SERVICE_URL ??
    'http://localhost:8084',
  payroll:
    process.env.PAYROLL_SERVICE_URL ??
    process.env.NEXT_PUBLIC_PAYROLL_SERVICE_URL ??
    'http://localhost:8085',
} as const;

const blockedRequestHeaders = new Set([
  'accept-encoding',
  'connection',
  'content-length',
  'host',
  'transfer-encoding',
]);

const blockedResponseHeaders = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
]);

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function buildTargetUrl(baseUrl: string, pathSegments: string[] | undefined, search: string): URL {
  const path = pathSegments?.map(encodeURIComponent).join('/') ?? '';
  const targetUrl = new URL(path, normalizeBaseUrl(baseUrl));
  targetUrl.search = search;
  return targetUrl;
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (!blockedRequestHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return headers;
}

function buildResponseHeaders(upstreamHeaders: Headers): Headers {
  const headers = new Headers();

  upstreamHeaders.forEach((value, key) => {
    if (!blockedResponseHeaders.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return headers;
}

async function buildProxyInit(request: NextRequest): Promise<RequestInit> {
  const init: RequestInit = {
    method: request.method,
    headers: buildForwardHeaders(request),
    cache: 'no-store',
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  return init;
}

async function proxyRequest(request: NextRequest, context: GatewayContext): Promise<NextResponse> {
  const params = await context.params;
  const service = params.service as keyof typeof serviceBaseUrls;
  const baseUrl = serviceBaseUrls[service];

  if (!baseUrl) {
    return NextResponse.json(
      { error: `Unknown gateway service: ${params.service}` },
      { status: 404 }
    );
  }

  const targetUrl = buildTargetUrl(baseUrl, params.path, request.nextUrl.search);

  try {
    const upstreamResponse = await fetch(targetUrl, await buildProxyInit(request));
    const responseBody = await upstreamResponse.arrayBuffer();

    return new NextResponse(responseBody.byteLength > 0 ? responseBody : null, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: buildResponseHeaders(upstreamResponse.headers),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Service unavailable';

    return NextResponse.json(
      {
        error: 'Gateway request failed',
        message,
        service,
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
