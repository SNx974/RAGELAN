import 'server-only';

/**
 * Envoi d'e-mails transactionnels.
 *
 * Aucune dépendance : on passe par l'API HTTP de Resend. Tant que
 * RESEND_API_KEY n'est pas renseignée, les messages sont journalisés au
 * lieu d'être envoyés — l'inscription et la validation continuent de
 * fonctionner, seul l'e-mail manque.
 */
const FROM = process.env.EMAIL_FROM ?? 'R.A.G.E LAN 2 <noreply@ragelan.rushxp.fr>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ragelan.rushxp.fr';

type Mail = { to: string; subject: string; html: string };

async function send({ to, subject, html }: Mail) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.warn(`[email] non configuré — message non envoyé à ${to} : « ${subject} »`);
    return { sent: false as const };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    if (!res.ok) {
      // Un échec d'envoi ne doit jamais annuler l'action métier associée.
      console.error(`[email] echec ${res.status} pour ${to} :`, await res.text());
      return { sent: false as const };
    }
    return { sent: true as const };
  } catch (error) {
    console.error(`[email] exception pour ${to} :`, error);
    return { sent: false as const };
  }
}

function layout(title: string, body: string) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#0D0D0D;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#e9e9e9">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="height:4px;background:linear-gradient(90deg,#FF2A2A,#FF6B00,#FFC700);border-radius:2px"></div>
    <p style="margin:24px 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#FF6B00">R.A.G.E LAN 2</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#fff">${title}</h1>
    ${body}
    <p style="margin-top:32px;padding-top:16px;border-top:1px solid #262626;font-size:12px;color:#777">
      23 &amp; 24 octobre 2026 — Gymnase Daniel Narcisse, 97419 La Possession<br>
      <a href="${APP_URL}" style="color:#FF6B00">${APP_URL.replace(/^https?:\/\//, '')}</a>
    </p>
  </div></body></html>`;
}

const P = 'margin:0 0 12px;font-size:15px;line-height:1.6;color:#c9c9c9';

/** Accusé de réception : l'inscription est enregistrée, pas encore validée. */
export function sendRegistrationReceivedEmail(o: {
  to: string;
  firstName: string;
  tournamentName: string;
  isTeam: boolean;
  priceLabel: string;
}) {
  return send({
    to: o.to,
    subject: `Inscription reçue — ${o.tournamentName}`,
    html: layout(
      `Bien reçu, ${o.firstName} !`,
      `<p style="${P}">${
        o.isTeam ? 'L’inscription de ton équipe' : 'Ton inscription'
      } sur <strong style="color:#fff">${o.tournamentName}</strong> nous est bien parvenue.</p>
       <p style="${P}">Elle est en attente de validation par l’organisation. Nous nous réservons
       le droit d’accepter ou non une inscription.</p>
       <p style="${P}"><strong style="color:#fff">Montant à régler : ${o.priceLabel}.</strong>
       Les instructions de paiement te seront transmises dès la validation. Aucune place
       n’est définitivement réservée avant réception du règlement.</p>`,
    ),
  });
}

/** Une place s'est libérée : le joueur passe de la liste d'attente à inscrit. */
export function sendWaitlistPromotedEmail(o: {
  to: string;
  firstName: string;
  tournamentName: string;
  reference: string;
}) {
  return send({
    to: o.to,
    subject: `Une place s’est libérée — ${o.tournamentName}`,
    html: layout(
      'Tu passes de la liste d’attente aux inscrits',
      `<p style="${P}">${o.firstName}, une place vient de se libérer sur
       <strong style="color:#fff">${o.tournamentName}</strong> : elle est pour toi.</p>
       <p style="${P}"><strong style="color:#fff">Règlement sur place le jour J.</strong>
       Présente-toi à l’accueil avec ta référence, le paiement se fera à l’entrée.</p>
       <p style="${P}">Ta référence : <strong style="color:#FF6B00;font-family:monospace;font-size:18px">${o.reference}</strong></p>`,
    ),
  });
}

/** Décision de l'admin sur une équipe. */
export function sendTeamDecisionEmail(o: {
  to: string;
  teamName: string;
  tournamentName: string;
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
}) {
  if (o.decision === 'APPROVED') {
    return send({
      to: o.to,
      subject: `Équipe validée — ${o.teamName}`,
      html: layout(
        'Ton équipe est validée',
        `<p style="${P}"><strong style="color:#fff">${o.teamName}</strong> est officiellement
         engagée sur <strong style="color:#fff">${o.tournamentName}</strong>.</p>
         <p style="${P}">Il reste une étape : le règlement de l’inscription. Sans paiement
         reçu avant l’événement, la place sera réattribuée.</p>
         <p style="${P}">Réponds directement à cet e-mail pour toute question.</p>`,
      ),
    });
  }

  return send({
    to: o.to,
    subject: `Inscription non retenue — ${o.teamName}`,
    html: layout(
      'Inscription non retenue',
      `<p style="${P}">L’inscription de <strong style="color:#fff">${o.teamName}</strong> sur
       ${o.tournamentName} n’a pas été retenue.</p>
       <p style="${P}"><strong style="color:#fff">Motif :</strong> ${o.reason ?? '—'}</p>
       <p style="${P}">Tu peux corriger et retenter, ou nous écrire en réponse à ce message.</p>`,
    ),
  });
}

/** Décision de l'admin sur un joueur solo. */
export function sendSoloDecisionEmail(o: {
  to: string;
  firstName: string;
  tournamentName: string;
  decision: 'CONFIRMED' | 'CANCELLED';
}) {
  const ok = o.decision === 'CONFIRMED';
  return send({
    to: o.to,
    subject: ok
      ? `Inscription confirmée — ${o.tournamentName}`
      : `Inscription non retenue — ${o.tournamentName}`,
    html: layout(
      ok ? 'Ta place est confirmée' : 'Inscription non retenue',
      ok
        ? `<p style="${P}">${o.firstName}, ta place sur <strong style="color:#fff">${o.tournamentName}</strong> est confirmée.</p>
           <p style="${P}">Pense au règlement de l’inscription : sans paiement reçu avant
           l’événement, la place sera réattribuée.</p>`
        : `<p style="${P}">${o.firstName}, ton inscription sur ${o.tournamentName} n’a pas été
           retenue. Écris-nous en réponse à ce message si tu souhaites en savoir plus.</p>`,
    ),
  });
}
