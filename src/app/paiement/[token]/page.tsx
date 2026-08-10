import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { SharePaymentPanel } from '@/components/registration/share-payment-panel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Régler ma part',
  // Un lien de paiement n'a rien à faire dans un index de moteur.
  robots: { index: false, follow: false },
};

/**
 * Page publique d'une part de paiement.
 * Accessible sans compte : le jeton du lien fait office d'autorisation.
 */
export default async function SharePaymentPage({ params }: { params: { token: string } }) {
  const share = await prisma.paymentShare.findUnique({
    where: { token: params.token },
    include: {
      member: { select: { firstName: true, lastName: true, pseudo: true } },
      team: {
        include: {
          tournament: {
            select: { name: true, formatLabel: true, teamSize: true, reserveThreshold: true, accentFrom: true },
          },
          shares: { select: { status: true } },
        },
      },
    },
  });

  // Un lien de paiement erroné mérite mieux qu'un 404 générique : la
  // personne l'a reçu par message et ne sait pas quoi en faire.
  if (!share) {
    return (
      <div className="container max-w-md py-20">
        <div className="glass-card px-6 py-12 text-center">
          <h1 className="font-display text-2xl font-bold text-white">Lien invalide</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Ce lien de paiement n&apos;existe pas ou a été remplacé. Demande à ton capitaine
            de t&apos;en renvoyer un depuis son espace.
          </p>
          <Link
            href="/tournois"
            className="mt-6 inline-block rounded-xl border border-white/12 px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5"
          >
            Voir les tournois
          </Link>
        </div>
      </div>
    );
  }

  const paidCount = share.team.shares.filter((s) => s.status === 'PAID').length;

  return (
    <SharePaymentPanel
      token={share.token}
      alreadyPaid={share.status === 'PAID'}
      amountCents={share.amountCents}
      playerName={`${share.member.firstName} ${share.member.lastName}`}
      playerPseudo={share.member.pseudo}
      teamName={share.team.name}
      teamTag={share.team.tag}
      hasLogo={share.team.logoData !== null}
      teamId={share.team.id}
      tournamentName={share.team.tournament.name}
      formatLabel={share.team.tournament.formatLabel}
      accent={share.team.tournament.accentFrom}
      paidCount={paidCount}
      teamSize={share.team.tournament.teamSize}
      reserveThreshold={share.team.tournament.reserveThreshold}
    />
  );
}
