import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET /api/teams/[id]/logo
 *
 * Le logo est stocké en base (le conteneur est éphémère : un fichier
 * écrit sur disque disparaîtrait au redéploiement). On le sert ici avec
 * un cache long, l'URL étant immuable pour une équipe donnée.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const team = await prisma.team.findUnique({
    where: { id: params.id },
    select: { logoData: true, logoMimeType: true, updatedAt: true },
  });

  if (!team?.logoData) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(team.logoData), {
    headers: {
      'Content-Type': team.logoMimeType ?? 'image/png',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Length': String(team.logoData.byteLength),
    },
  });
}
