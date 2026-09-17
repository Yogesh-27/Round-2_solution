import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { UserRole } from '@prisma/client';
import type { AuthUser } from '../types/auth.js';

const COOKIE_NAME = 'cafe_points_token';

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name, email: user.email }, config.JWT_SECRET, { expiresIn: '12h' });
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload & { role?: UserRole; name?: string; email?: string };
  if (!payload.sub || !payload.role || !payload.name || !payload.email) throw new Error('Invalid token payload');
  return { id: payload.sub, role: payload.role, name: payload.name, email: payload.email };
}

export const authCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/'
  }
};
