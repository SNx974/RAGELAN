'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { GitBranch, RefreshCw, Download } from 'lucide-react';
import { BracketTree, type BracketMatch } from '@/components/brackets/bracket-tree';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateBracketAction, reportScoreAction } from '@/app/actions/admin';

export function BracketBoard({
  tournamentId,
  tournamentName,
  teamCount,
  bracketStatus,
  matches,
}: {
  tournamentId: string;
  tournamentName: string;
  teamCount: number;
  bracketStatus: string;
  matches: BracketMatch[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateBracketAction(tournamentId);
      if ('error' in result && result.error) toast.error(result.error);
      else {
        toast.success('Arbre généré.');
        router.refresh();
      }
    });
  }

  async function report(matchId: string, scoreA: number, scoreB: number) {
    const result = await reportScoreAction(tournamentId, { matchId, scoreA, scoreB });
    if ('error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Score enregistré, l’arbre progresse.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
            Arbre de tournoi
          </p>
          <h1 className="font-display text-3xl font-bold text-white">{tournamentName}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={bracketStatus === 'COMPLETED' ? 'success' : 'default'}>
              {bracketStatus}
            </Badge>
            <span className="text-sm text-muted-foreground">{teamCount} équipes inscrites</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm">
            <a href={`/api/admin/tournaments/${tournamentId}/attendance`} target="_blank" rel="noreferrer">
              <Download />
              Fiche PDF
            </a>
          </Button>
          <Button onClick={generate} disabled={pending || teamCount < 2}>
            {matches.length > 0 ? <RefreshCw /> : <GitBranch />}
            {matches.length > 0 ? 'Régénérer' : 'Générer l’arbre'}
          </Button>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="glass-card grid place-items-center px-6 py-20 text-center">
          <GitBranch className="mb-4 size-10 text-white/15" />
          <p className="font-display text-lg font-bold text-white">Aucun arbre généré</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {teamCount < 2
              ? 'Il faut au moins 2 équipes inscrites pour générer un arbre.'
              : 'Génère l’arbre pour répartir les équipes selon leur seed.'}
          </p>
        </div>
      ) : (
        <BracketTree matches={matches} editable onReport={report} />
      )}
    </div>
  );
}
