'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole, requireTournamentAccess } from '@/lib/auth';
import { generateBracket, reportMatchResult } from '@/lib/bracket';
import {
  assignSeatSchema,
  manualTeamSchema,
  promoteUserSchema,
  reportScoreSchema,
  updateTournamentSchema,
} from '@/lib/validations';
import { sendSoloDecisionEmail, sendTeamDecisionEmail } from '@/lib/email';
import { layoutSeats } from '@/lib/floorplan';
import { generateReference } from '@/lib/reference';
import { TOURNAMENTS } from '@/lib/tournaments-data';

/**
 * Édition d'un tournoi : prix, effectifs, tables et chaises.
 *
 * Toucher au nombre de tables ou de chaises invalide le plan de salle :
 * on le régénère, ce qui libère les joueurs déjà placés. Le nombre de
 * places perdues est renvoyé pour que l'admin en soit informé.
 */
export async function updateTournament(tournamentId: string, input: unknown) {
  const session = await requireRole('ADMIN');

  const parsed = updateTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  }
  const data = parsed.data;

  const current = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!current) return { error: 'Tournoi introuvable.' };

  // En places fixes, il faut au moins une chaise par joueur attendu.
  if (data.seatFormat === 'FIXED' && data.chairCount < data.maxPlayers) {
    return {
      error: `Places fixes : ${data.maxPlayers} joueurs demandent au moins ${data.maxPlayers} chaises (${data.chairCount} saisies).`,
    };
  }

  const registered = await prisma.registration.count({
    where: { tournamentId, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
  });
  if (data.maxPlayers < registered) {
    return {
      error: `${registered} joueurs sont déjà inscrits : impossible de descendre la capacité à ${data.maxPlayers}.`,
    };
  }

  const planChanged =
    data.tableCount !== current.tableCount ||
    data.chairCount !== current.chairCount ||
    data.seatFormat !== current.seatFormat;

  let seatsRebuilt = 0;
  let placementsLost = 0;

  await prisma.$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        name: data.name,
        tagline: data.tagline,
        formatLabel: data.formatLabel,
        entryFeeCents: data.entryFeeCents,
        maxPlayers: data.maxPlayers,
        maxTeams: data.maxTeams,
        teamSize: data.teamSize,
        tableCount: data.tableCount,
        chairCount: data.chairCount,
        seatFormat: data.seatFormat,
        registrationOpen: data.registrationOpen,
      },
    });

    if (planChanged) {
      placementsLost = await tx.seatPlacement.count({
        where: { seat: { tournamentId } },
      });
      // La suppression des sièges casse en cascade les placements.
      await tx.seat.deleteMany({ where: { tournamentId } });

      const seed = TOURNAMENTS.find((t) => t.slug === current.slug);
      const seats = layoutSeats(
        current.slug,
        seed?.zone ?? `Zone ${current.name}`,
        seed?.seatKind ?? 'PC',
        data.tableCount,
        data.chairCount,
      );
      await tx.seat.createMany({
        data: seats.map((s) => ({ ...s, tournamentId })),
        skipDuplicates: true,
      });
      seatsRebuilt = seats.length;
    }

    await tx.auditLog.create({
      data: {
        actorId: session.sub,
        action: 'tournament.update',
        entityType: 'tournament',
        entityId: tournamentId,
        payload: { ...data, planChanged, placementsLost },
      },
    });
  });

  revalidatePath('/admin/tournois');
  revalidatePath('/tournois');
  revalidatePath(`/tournois/${current.slug}`);
  return { success: true as const, planChanged, seatsRebuilt, placementsLost };
}

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

/** Réglages généraux de l'événement. */
export async function updateEventSettings(input: {
  eventName: string;
  venueName: string;
  venueAddress: string;
  registrationsOpen: boolean;
}) {
  const session = await requireRole('ADMIN');

  if (!input.eventName?.trim()) return { error: 'Le nom de l’événement est obligatoire.' };

  await prisma.eventSettings.upsert({
    where: { id: 1 },
    update: {
      eventName: input.eventName.trim(),
      venueName: input.venueName.trim(),
      venueAddress: input.venueAddress.trim(),
      registrationsOpen: input.registrationsOpen,
    },
    create: {
      id: 1,
      eventName: input.eventName.trim(),
      venueName: input.venueName.trim(),
      venueAddress: input.venueAddress.trim(),
      registrationsOpen: input.registrationsOpen,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: 'settings.update',
      entityType: 'event_settings',
      entityId: '1',
    },
  });

  revalidatePath('/', 'layout');
  return { success: true as const };
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

/**
 * Inscription manuelle d'une équipe. Réservé au SUPER_ADMIN.
 *
 * La contrainte « 1 équipe par compte » porte sur le capitaine : on
 * rattache donc chaque équipe saisie à un compte réel, créé au besoin à
 * partir de l'e-mail du référent. Le compte est sans mot de passe
 * utilisable — le référent devra passer par « mot de passe oublié ».
 */
export async function createTeamManually(input: unknown) {
  const session = await requireRole('SUPER_ADMIN');

  const parsed = manualTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Formulaire invalide.' };
  }
  const data = parsed.data;

  const tournament = await prisma.tournament.findUnique({ where: { id: data.tournamentId } });
  if (!tournament) return { error: 'Tournoi introuvable.' };

  try {
    const team = await prisma.$transaction(async (tx) => {
      let captain = await tx.user.findUnique({ where: { email: data.contactEmail } });

      if (!captain) {
        captain = await tx.user.create({
          data: {
            email: data.contactEmail,
            // Hash volontairement inutilisable : aucun mot de passe ne
            // peut y correspondre, le compte n'est pas connectable tel quel.
            passwordHash: 'manual-entry-no-login',
            firstName: data.captainFirstName,
            lastName: data.captainLastName,
            birthDate: new Date('1990-01-01'),
            phone: data.contactPhone,
            addressLine: 'Saisie manuelle',
            postalCode: '00000',
            city: '—',
          },
        });
      } else {
        const already = await tx.team.findUnique({ where: { captainId: captain.id } });
        if (already) {
          throw new Error(`Ce compte a déjà inscrit l’équipe « ${already.name} ».`);
        }
      }

      const created = await tx.team.create({
        data: {
          tournamentId: tournament.id,
          captainId: captain.id,
          name: data.teamName,
          tag: data.teamTag || null,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          // Saisie par un admin : validée d'office.
          status: 'APPROVED',
          reviewedById: session.sub,
          reviewedAt: new Date(),
          members: {
            create: data.members.map((m, i) => ({
              firstName: m.firstName,
              lastName: m.lastName,
              pseudo: m.pseudo,
              reference: generateReference(),
              birthDate: m.birthDate,
              isCaptain: i === 0,
              isSubstitute: m.isSubstitute,
              userId: i === 0 ? captain!.id : null,
            })),
          },
        },
      });

      await tx.registration.create({
        data: {
          userId: captain.id,
          tournamentId: tournament.id,
          teamId: created.id,
          type: 'TEAM_CAPTAIN',
          reference: generateReference(),
          status: 'CONFIRMED',
          paymentStatus: 'PAY_ON_SITE',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: session.sub,
          action: 'team.manual_create',
          entityType: 'team',
          entityId: created.id,
          payload: { name: created.name, tournament: tournament.slug },
        },
      });

      return created;
    });

    revalidatePath('/admin/equipes');
    revalidatePath(`/tournois/${tournament.slug}`);
    return { success: true as const, teamId: team.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Création impossible.';
    if (message.includes('uq_team_name_per_tournament')) {
      return { error: 'Ce nom d’équipe est déjà pris sur ce tournoi.' };
    }
    if (message.includes('uq_one_team_per_account')) {
      return { error: 'Ce compte a déjà une équipe inscrite.' };
    }
    return { error: message };
  }
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
