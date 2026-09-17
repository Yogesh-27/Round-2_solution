import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { normalizePhoneNumber } from '../utils/phone.js';
import { AppError, errors } from '../utils/errors.js';

const SORT_FIELDS: Record<string, Prisma.MemberOrderByWithRelationInput> = {
  name: { fullName: 'asc' },
  phone: { normalizedPhoneNumber: 'asc' },
  tier: { currentTier: 'asc' },
  balance: { currentPointsBalance: 'asc' },
  lifetimeEarnedPoints: { lifetimeEarnedPoints: 'asc' },
  createdAt: { createdAt: 'asc' }
};

export async function createMember(prisma: PrismaClient, input: { fullName: string; phoneNumber: string; email?: string }) {
  const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber);
  if (!normalizedPhoneNumber) throw new AppError(422, 'INVALID_PHONE', 'Phone number must contain at least one digit.');
  try {
    return await prisma.member.create({
      data: {
        fullName: input.fullName,
        phoneNumber: input.phoneNumber,
        normalizedPhoneNumber,
        email: input.email || null
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw errors.duplicatePhone();
    throw error;
  }
}

export async function listMembers(prisma: PrismaClient, query: { search: string; page: number; pageSize: number; sortBy: string; sortOrder: 'asc' | 'desc' }) {
  const search = query.search.trim();
  const normalizedSearch = normalizePhoneNumber(search);
  const where: Prisma.MemberWhereInput = search
    ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          ...(normalizedSearch ? [{ normalizedPhoneNumber: { contains: normalizedSearch } }] : [])
        ]
      }
    : {};

  const orderTemplate = SORT_FIELDS[query.sortBy];
  if (!orderTemplate) throw new Error('Unsupported sort field');
  const [field, defaultDirection] = Object.entries(orderTemplate)[0] as [string, 'asc'];
  const orderBy = { [field]: query.sortOrder } as Prisma.MemberOrderByWithRelationInput;
  const skip = (query.page - 1) * query.pageSize;
  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: query.pageSize,
      orderBy,
      select: { id: true, fullName: true, phoneNumber: true, email: true, currentTier: true, lifetimeEarnedPoints: true, currentPointsBalance: true, createdAt: true }
    }),
    prisma.member.count({ where })
  ]);
  void defaultDirection;

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
    hasNext: query.page * query.pageSize < total,
    hasPrevious: query.page > 1
  };
}

export async function getMember(prisma: PrismaClient, id: string) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw errors.memberNotFound();
  return member;
}
