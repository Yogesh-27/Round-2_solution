import type { Request } from 'express';
import type { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };
