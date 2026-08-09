'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';

/**
 * Point d'entrée du paiement en ligne.
 * L'intégration Stripe complète se branche dans
 * `POST /api/payments/checkout` (voir le TODO côté serveur) ;
 * ce composant est déjà câblé pour la redirection.
 */
export function StripeCheckoutButton({
  registrationId,
  amountCents,
  className,
}: {
  registrationId: string;
  amountCents: number;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? 'Paiement indisponible pour le moment.');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('Impossible de joindre le service de paiement.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={checkout} disabled={loading} className={className}>
      {loading ? <Loader2 className="animate-spin" /> : <CreditCard />}
      Payer {formatPrice(amountCents)} en ligne
    </Button>
  );
}
