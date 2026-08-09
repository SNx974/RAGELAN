import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cache } from 'react';
import type { Role } from '@prisma/client';
import { prisma } from './prisma';

const COOKIE = process.env.AUTH_COOKIE_NAME ?? 'rage_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET manquant ou trop court (32 caractères minimum).');
  }
  return new TextEncoder().encode(value);
}

export type SessionPayload = {
  sub: string;
  email: string;
  role: Role;
  name: string;
};

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

/** Payload du JWT, sans aller en base. `cache` = 1 vérif par requête. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
});

/** Utilisateur complet depuis la base — pour les pages qui en ont besoin. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      organizerScopes: { include: { tournament: true } },
    },
  });
});

const RANK: Record<Role, number> = {
  PLAYER: 0,
  ORGANIZER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function hasRole(role: Role | undefined, minimum: Role) {
  if (!role) return false;
  return RANK[role] >= RANK[minimum];
}

/** À appeler en tête des Server Actions / route handlers protégés. */
export async function requireRole(minimum: Role) {
  const session = await getSession();
  if (!session || !hasRole(session.role, minimum)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/**
 * Un ORGANIZER n'agit que sur les tournois qui lui sont assignés ;
 * ADMIN et SUPER_ADMIN passent partout.
 */
export async function requireTournamentAccess(
  tournamentId: string,
  capability: 'canManageBracket' | 'canCheckIn' | 'canCollectPayment' = 'canManageBracket',
) {
  const session = await requireRole('ORGANIZER');
  if (hasRole(session.role, 'ADMIN')) return session;

  const scope = await prisma.organizerAssignment.findUnique({
    where: { userId_tournamentId: { userId: session.sub, tournamentId } },
  });
  if (!scope || !scope[capability]) throw new Error('FORBIDDEN');
  return session;
}
