import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types';

interface DevUser {
  id: string;
  username: string;
  email: string;
  role: Extract<UserRole, 'MANDOR' | 'SUPIR' | 'ADMIN'>;
}

interface TokenPayload {
  sub: string;
  role: DevUser['role'];
  iat: number;
  exp: number;
}

const devUsers: Record<DevUser['role'], DevUser> = {
  MANDOR: {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    username: 'mandor-local',
    email: 'mandor-local@mysawit.test',
    role: 'MANDOR',
  },
  SUPIR: {
    id: 'bbbbbbbb-2222-2222-2222-222222222222',
    username: 'supir-local',
    email: 'supir-local@mysawit.test',
    role: 'SUPIR',
  },
  ADMIN: {
    id: 'cccccccc-3333-3333-3333-333333333333',
    username: 'admin-local',
    email: 'admin-local@mysawit.test',
    role: 'ADMIN',
  },
};

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function signJwt(payload: TokenPayload, secret: string): string {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest();

  return `${header}.${body}.${toBase64Url(signature)}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.SHIPMENT_DEV_AUTH_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Shipment dev auth is disabled' },
      { status: 404 }
    );
  }

  const secret = process.env.SHIPMENT_DEV_JWT_SECRET;
  if (!secret || secret === 'PASTE_SAME_VALUE_AS_SHIPMENT_JWT_SECRET') {
    return NextResponse.json(
      { error: 'SHIPMENT_DEV_JWT_SECRET is not configured' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const role = typeof body.role === 'string' ? body.role.toUpperCase() : 'MANDOR';
  const user = devUsers[role as DevUser['role']];

  if (!user) {
    return NextResponse.json(
      { error: 'Unsupported shipment dev role' },
      { status: 400 }
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const token = signJwt(
    {
      sub: user.id,
      role: user.role,
      iat: now,
      exp: now + 60 * 60 * 8,
    },
    secret
  );

  return NextResponse.json({
    token,
    type: 'Bearer',
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });
}
