'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';
import { loginSchema, registerSchema } from '@/lib/validations';

export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> } | null;

/**
 * Destination après connexion, transmise par le middleware via `?next=`.
 *
 * Seuls les chemins internes sont acceptés : une valeur commençant par
 * `//` ou `/\` serait interprétée comme une URL absolue par le
 * navigateur et permettrait une redirection vers un site tiers.
 */
function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    ...Object.fromEntries(formData),
    acceptRules: formData.get('acceptRules') === 'on' || formData.get('acceptRules') === 'true',
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { error: 'Un compte existe déjà avec cet email.' };

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
      pseudo: data.pseudo || null,
      birthDate: data.birthDate,
      phone: data.phone,
      addressLine: data.addressLine,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
      guardianName: data.guardianName || null,
      guardianPhone: data.guardianPhone || null,
    },
  });

  await createSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
  });

  redirect(safeNext(formData.get('next')) ?? '/dashboard');
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Message générique : ne pas révéler l'existence du compte.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: 'Email ou mot de passe incorrect.' };
  }

  await createSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
  });

  // La destination demandée prime : c'est elle qui a provoqué la
  // redirection vers la connexion.
  redirect(
    safeNext(formData.get('next')) ??
      (user.role === 'PLAYER' ? '/dashboard' : user.role === 'ORGANIZER' ? '/staff' : '/admin'),
  );
}

export async function logoutAction() {
  destroySession();
  redirect('/');
}
