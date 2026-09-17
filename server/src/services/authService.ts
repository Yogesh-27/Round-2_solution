import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { errors } from '../utils/errors.js';
import type { AuthUser } from '../types/auth.js';

export async function register(input: { name: string; email: string; password: string }): Promise<AuthUser> {
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash } });
    return { id: user.id, role: user.role, name: user.name, email: user.email };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw errors.duplicateEmail();
    throw error;
  }
}

export async function login(input: { email: string; password: string }): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw errors.invalidCredentials();
  return { id: user.id, role: user.role, name: user.name, email: user.email };
}
