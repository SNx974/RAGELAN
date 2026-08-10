import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { isValidReference, normalizeReference } from '@/lib/reference';

export const runtime = 'nodejs';

/**
 * GET /api/qr/RAGE-7K2M9Q
 *
 * QR code d'une référence, en PNG. Servi par URL plutôt qu'en data URI :
 * Gmail et Outlook bloquent les images `data:` dans les e-mails.
 *
 * Aucune donnée personnelle n'est encodée — uniquement la référence,
 * qui ne révèle rien par elle-même et n'est exploitable qu'en étant
 * authentifié côté staff.
 */
export async function GET(_request: Request, { params }: { params: { reference: string } }) {
  const reference = normalizeReference(decodeURIComponent(params.reference));

  if (!isValidReference(reference)) {
    return NextResponse.json({ error: 'Référence invalide' }, { status: 400 });
  }

  const png = await QRCode.toBuffer(reference, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0D0D0D', light: '#FFFFFF' },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // La référence est immuable : le QR peut être mis en cache longtemps.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(png.byteLength),
    },
  });
}
