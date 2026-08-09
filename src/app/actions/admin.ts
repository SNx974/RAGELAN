'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole, requireTournamentAccess } from '@/lib/auth';
import { generateBracket, reportMatchResult } from '@/lib/bracket';
import { assignSeatSchema, promoteUserSchema, reportScoreSchema } from '@/lib/validations';
import { sendSoloDecisionEmail, sendTeamDecisionEmail } from '@/lib/email';

/** Ouvre/ferme les inscriptions d'un jeu. */
export async function toggleTournamentRegistration(tournamentId: string, open: boolean) {
  const session = await requireRole('ADMIN');
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { registrationOpen: open },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: open ? 'tournament.open' : 'tournament.close',
      entityType: 'tournament',
      entityId: tournamentId,
    },
  });
  revalidatePath('/admin');
  revalidatePath('/tournois');
  return { success: true };
}

/** Interrupteur global des inscriptions. */
export async function toggleGlobalRegistrations(open: boolean) {
  await requireRole('ADMIN');
  await prisma.eventSettings.upsert({
    where: { id: 1 },
    update: { registrationsOpen: open },
    create: { id: 1, registrationsOpen: open },
  });
  revalidatePath('/', 'layout');
  return { success: true };
}

/** Promotion / rétrogradation d'un compte. Réservé au SUPER_ADMIN. */
export async function setUserRole(input: unknown) {
  const session = await requireRole('SUPER_ADMIN');
  const parsed = promoteUserSchema.safeParse(input);
  if (!parsed.success) return { error: 'Requête invalide.' };

  if (parsed.data.userId === session.sub) {
    return { error: 'Impossible de modifier son propre rôle.' };
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: 'user.role',
      entityType: 'user',
      entityId: parsed.data.userId,
      payload: { role: parsed.data.role },
    },
  });

  revalidatePath('/admin/utilisateurs');
  return { success: true };
}

/** Assigne un organisateur à un tournoi. */
export async function assignOrganizer(userId: string, tournamentId: string) {
  await requireRole('ADMIN');
  await prisma.organizerAssignment.upsert({
    where: { userId_tournamentId: { userId, tournamentId } },
    update: {},
    create: { userId, tournamentId },
  });
  revalidatePath('/admin/staff');
  return { success: true };
}

export async function removeOrganizer(userId: string, tournamentId: string) {
  await requireRole('ADMIN');
  await prisma.organizerAssignment.deleteMany({ where: { userId, tournamentId } });
  revalidatePath('/admin/staff');
  return { success: true };
}

/**
 * Validation d'une équipe par un admin. Rien n'est engagé avant :
 * l'équipe n'apparaît pas publiquement et ne peut pas être seedée.
 * L'approbation confirme aussi l'inscription du référent.
 */
export async function reviewTeam(
  teamId: string,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string,
) {
  const session = await requireRole('ADMIN');

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { tournament: { select: { name: true, slug: true } } },
  });
  if (!team) return { error: 'Équipe introuvable.' };

  if (decision === 'REJECTED' && !reason?.trim()) {
    return { error: 'Motif de refus obligatoire : il est transmis au référent.' };
  }

  await prisma.$transaction([
    prisma.team.update({
      where: { id: teamId },
      data: {
        status: decision,
        reviewedById: session.sub,
        reviewedAt: new Date(),
        rejectionReason: decision === 'REJECTED' ? reason!.trim() : null,
      },
    }),
    prisma.registration.updateMany({
      where: { teamId },
      data: { status: decision === 'APPROVED' ? 'CONFIRMED' : 'CANCELLED' },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.sub,
        action: decision === 'APPROVED' ? 'team.approve' : 'team.reject',
        entityType: 'team',
        entityId: teamId,
        payload: { name: team.name, tournament: team.tournament.slug, reason: reason ?? null },
      },
    }),
  ]);

  await sendTeamDecisionEmail({
    to: team.contactEmail,
    teamName: team.name,
    tournamentName: team.tournament.name,
    decision,
    reason,
  });

  revalidatePath('/admin/equipes');
  revalidatePath(`/tournois/${team.tournament.slug}`);
  return { success: true };
}

/** Accepte ou refuse un joueur solo. */
export async function reviewRegistration(
  registrationId: string,
  decision: 'CONFIRMED' | 'CANCELLED',
) {
  const session = await requireRole('ADMIN');

  const registration = await prisma.registration.update({
    where: { id: registrationId },
    data: { status: decision },
    include: {
      user: { select: { email: true, firstName: true } },
      tournament: { select: { name: true, slug: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: decision === 'CONFIRMED' ? 'registration.approve' : 'registration.reject',
      entityType: 'registration',
      entityId: registrationId,
    },
  });

  await sendSoloDecisionEmail({
    to: registration.user.email,
    firstName: registration.user.firstName,
    tournamentName: registration.tournament.name,
    decision,
  });

  revalidatePath('/admin/inscriptions');
  return { success: true };
}

/** Génère (ou régénère) l'arbre de tournoi. */
export async function generateBracketAction(tournamentId: string, bestOf = 1) {
  const session = await requireTournamentAccess(tournamentId, 'canManageBracket');
  try {
    const bracket = await generateBracket(tournamentId, { bestOf });
    await prisma.auditLog.create({
      data: {
        actorId: session.sub,
        action: 'bracket.generate',
        entityType: 'bracket',
        entityId: bracket.id,
      },
    });
    revalidatePath(`/admin/tournois/${tournamentId}/bracket`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Génération impossible.' };
  }
}

/** Saisie d'un score + progression de l'arbre. */
export async function reportScoreAction(tournamentId: string, input: unknown) {
  const session = await requireTournamentAccess(tournamentId, 'canManageBracket');
  const parsed = reportScoreSchema.safeParse(input);
  if (!parsed.success) return { error: 'Score invalide.' };

  try {
    await reportMatchResult(
      parsed.data.matchId,
      parsed.data.scoreA,
      parsed.data.scoreB,
      session.sub,
    );
    revalidatePath(`/admin/tournois/${tournamentId}/bracket`);
    revalidatePath(`/staff/tournois/${tournamentId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Impossible d’enregistrer le score.' };
  }
}

/**
 * Assigne (ou libère) un siège.
 * `registrationId === null` libère la place.
 */
export async function assignSeatAction(tournamentId: string, input: unknown) {
  const session = await requireTournamentAccess(tournamentId, 'canManageBracket');
  const parsed = assignSeatSchema.safeParse(input);
  if (!parsed.success) return { error: 'Requête invalide.' };
  const { seatId, registrationId } = parsed.data;

  try {
    if (registrationId === null) {
      await prisma.seatPlacement.deleteMany({ where: { seatId } });
    } else {
      const registration = await prisma.registration.findUniqueOrThrow({
        where: { id: registrationId },
        select: { userId: true, teamId: true, tournamentId: true },
      });
      if (registration.tournamentId !== tournamentId) {
        return { error: 'Cette inscription relève d’un autre tournoi.' };
      }

      // Un joueur ne peut occuper qu'une place : on libère l'ancienne.
      await prisma.$transaction([
        prisma.seatPlacement.deleteMany({ where: { registrationId } }),
        prisma.seatPlacement.deleteMany({ where: { seatId } }),
        prisma.seatPlacement.create({
          data: {
            seatId,
            registrationId,
            userId: registration.userId,
            teamId: registration.teamId,
            assignedById: session.sub,
          },
        }),
      ]);
    }

    revalidatePath(`/admin/tournois/${tournamentId}/placement`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Placement impossible.' };
  }
}

/**
 * Placement automatique : les équipes sont posées côte à côte,
 * table par table, dans l'ordre des seeds.
 */
export async function autoAssignSeats(
  tournamentId: string,
): Promise<{ error: string } | { placed: number; unplaced: number }> {
  try {
    await requireTournamentAccess(tournamentId, 'canManageBracket');
  } catch {
    return { error: 'Accès refusé sur ce tournoi.' };
  }

  const [seats, registrations] = await Promise.all([
    prisma.seat.findMany({
      where: { tournamentId, isActive: true, placement: { is: null } },
      orderBy: [{ tableLabel: 'asc' }, { seatLabel: 'asc' }],
    }),
    prisma.registration.findMany({
      where: {
        tournamentId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        seatPlacement: { is: null },
      },
      include: { team: { select: { id: true, seed: true, name: true } } },
      orderBy: [{ team: { seed: 'asc' } }, { createdAt: 'asc' }],
    }),
  ]);

  const pairs = registrations.slice(0, seats.length).map((r, i) => ({
    seatId: seats[i].id,
    registrationId: r.id,
    userId: r.userId,
    teamId: r.teamId,
  }));

  if (pairs.length === 0) return { placed: 0, unplaced: registrations.length };

  await prisma.seatPlacement.createMany({ data: pairs, skipDuplicates: true });

  revalidatePath(`/admin/tournois/${tournamentId}/placement`);
  revalidatePath(`/staff/tournois/${tournamentId}/placement`);
  return { placed: pairs.length, unplaced: registrations.length - pairs.length };
}
