'use client';

import { CalendarDays, MapPin, Receipt, Ticket, UserRound, AlertTriangle } from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/utils';
import { refundNotice } from '@/lib/pricing';

export type RegistrationTournament = {
  slug: string;
  name: string;
  formatLabel: string;
  teamSize: number;
  entryFeeCents: number;
  totalDueCents: number;
  shareCents: number;
  reserveThreshold: number;
  accentFrom: string;
  accentTo: string;
};

export type RegistrationUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pseudo: string | null;
  birthDate: string;
  addressLine: string;
  postalCode: string;
  city: string;
};

export type FormProps = {
  tournament: RegistrationTournament;
  user: RegistrationUser;
  venue: string;
  venueAddress: string;
};

const EVENT_DATE = process.env.NEXT_PUBLIC_EVENT_DATE ?? '2026-10-23';

/** En-tête commun aux deux parcours. */
export function StepHeader({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
        Étape {step} sur {total}
      </p>
      <h1 className="mt-1.5 font-display text-3xl font-bold text-white">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={
              i < step
                ? 'h-1 flex-1 rounded-full bg-rage-gradient'
                : 'h-1 flex-1 rounded-full bg-white/10'
            }
          />
        ))}
      </div>
    </div>
  );
}

/** Récapitulatif présenté avant tout paiement. */
export function RecapCard({
  tournament,
  user,
  venue,
  venueAddress,
  extra,
}: FormProps & { extra?: { label: string; value: string }[] }) {
  const isTeam = tournament.teamSize > 1;

  return (
    <div className="space-y-4">
      <section className="glass-card overflow-hidden">
        <Header icon={Ticket} title="Le tournoi" accent={tournament.accentFrom} />
        <dl className="divide-y divide-white/[0.05]">
          <Row label="Tournoi" value={tournament.name} />
          <Row label="Format" value={tournament.formatLabel} />
          <Row
            label="Date"
            value={formatDate(EVENT_DATE)}
            icon={CalendarDays}
          />
          <Row label="Lieu" value={`${venue} — ${venueAddress}`} icon={MapPin} />
        </dl>
      </section>

      <section className="glass-card overflow-hidden">
        <Header icon={UserRound} title="Tes informations" accent={tournament.accentFrom} />
        <dl className="divide-y divide-white/[0.05]">
          <Row label="Nom" value={`${user.firstName} ${user.lastName}`} />
          <Row label="Email" value={user.email} />
          <Row label="Téléphone" value={user.phone} />
          <Row label="Adresse" value={`${user.addressLine}, ${user.postalCode} ${user.city}`} />
          {extra?.map((e) => <Row key={e.label} label={e.label} value={e.value} />)}
        </dl>
      </section>

      <section className="glass-card overflow-hidden">
        <Header icon={Receipt} title="Montant" accent={tournament.accentFrom} />
        <dl className="divide-y divide-white/[0.05]">
          {isTeam ? (
            <>
              <Row label="Prix par joueur" value={formatPrice(tournament.shareCents)} />
              <Row label="Effectif" value={`${tournament.teamSize} joueurs`} />
              <Row label="Total équipe" value={formatPrice(tournament.totalDueCents)} strong />
            </>
          ) : (
            <Row label="Total à régler" value={formatPrice(tournament.totalDueCents)} strong />
          )}
        </dl>
      </section>

      {isTeam ? (
        <Notice>{refundNotice(tournament.reserveThreshold)}</Notice>
      ) : (
        <Notice>
          Aucune place n’est réservée sans paiement. Tu peux venir régler sur place le jour J,
          mais dans ce cas ta place n’est pas garantie.
        </Notice>
      )}
    </div>
  );
}

function Header({
  icon: Icon,
  title,
  accent,
}: {
  icon: typeof Ticket;
  title: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-5 py-3">
      <Icon className="size-4" style={{ color: accent }} />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
        {title}
      </h2>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
  strong,
}: {
  label: string;
  value: string;
  icon?: typeof Ticket;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
      <dt className="flex items-center gap-1.5 text-sm text-white/45">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd
        className={
          strong
            ? 'font-display text-xl font-bold text-rage-orange'
            : 'text-right text-sm font-medium text-white'
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-xl border border-rage-yellow/25 bg-rage-yellow/[0.07] px-4 py-3 text-xs leading-relaxed text-rage-yellow">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
