'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Wand2, Download } from 'lucide-react';
import { FloorPlan, type PlanSeat, type PlanPlayer } from '@/components/floorplan/floor-plan';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { assignSeatAction, autoAssignSeats } from '@/app/actions/admin';

export function PlacementBoard({
  tournamentId,
  tournamentName,
  seatFormat,
  accent,
  seats,
  unassigned,
}: {
  tournamentId: string;
  tournamentName: string;
  seatFormat: 'FIXED' | 'ROTATION';
  accent: string;
  seats: PlanSeat[];
  unassigned: PlanPlayer[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleAssign(seatId: string, registrationId: string | null) {
    const result = await assignSeatAction(tournamentId, { seatId, registrationId });
    if ('error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(registrationId ? 'Joueur placé.' : 'Place libérée.');
    router.refresh();
  }

  function autoPlace() {
    startTransition(async () => {
      const result = await autoAssignSeats(tournamentId);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.unplaced > 0
          ? `${result.placed} joueurs placés · ${result.unplaced} sans siège disponible.`
          : `${result.placed} joueurs placés automatiquement.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
            Plan de salle
          </p>
          <h1 className="font-display text-3xl font-bold text-white">{tournamentName}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={seatFormat === 'FIXED' ? 'default' : 'yellow'}>
              {seatFormat === 'FIXED' ? 'Places fixes' : 'Rotation'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {unassigned.length} joueur{unassigned.length > 1 ? 's' : ''} à placer
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm">
            <a
              href={`/api/admin/tournaments/${tournamentId}/attendance`}
              target="_blank"
              rel="noreferrer"
            >
              <Download />
              Fiche PDF
            </a>
          </Button>
          <Button onClick={autoPlace} disabled={pending || unassigned.length === 0}>
            <Wand2 />
            Placement auto
          </Button>
        </div>
      </div>

      <FloorPlan
        seats={seats}
        unassigned={unassigned}
        tournamentName={tournamentName}
        accent={accent}
        onAssign={handleAssign}
      />
    </div>
  );
}
