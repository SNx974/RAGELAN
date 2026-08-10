'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Keyboard,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react';
import { confirmPresence, lookupReference, type ScanResult } from '@/app/actions/checkin';
import { formatPrice, cn } from '@/lib/utils';

/**
 * Scan de QR code par la caméra du téléphone.
 *
 * jsQR décode une image, pas un flux : on échantillonne donc la vidéo
 * dans un canvas à intervalle régulier. `requestAnimationFrame` serait
 * inutilement coûteux — 8 images par seconde suffisent largement pour
 * un QR tenu à la main, et ménagent la batterie.
 */
const SCAN_INTERVAL_MS = 125;

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScanRef = useRef<string>('');

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleReference = useCallback(async (reference: string) => {
    // Un QR reste dans le champ plusieurs secondes : sans ce garde, on
    // relancerait la recherche dix fois par seconde.
    if (reference === lastScanRef.current) return;
    lastScanRef.current = reference;

    setBusy(true);
    try {
      const found = await lookupReference(reference);
      setResult(found);
      if (found.kind === 'OK' && navigator.vibrate) navigator.vibrate(60);
    } finally {
      setBusy(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // `environment` : caméra arrière sur téléphone.
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      timerRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code?.data) void handleReference(code.data);
      }, SCAN_INTERVAL_MS);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      setCameraError(
        name === 'NotAllowedError'
          ? 'Accès à la caméra refusé. Autorise-le dans les réglages du navigateur.'
          : name === 'NotFoundError'
            ? 'Aucune caméra détectée sur cet appareil.'
            : 'Caméra indisponible. La saisie manuelle reste utilisable.',
      );
    }
  }, [handleReference]);

  // Libère la caméra si l'on quitte la page sans l'arrêter.
  useEffect(() => () => stop(), [stop]);

  async function validate() {
    if (result?.kind !== 'OK') return;
    setBusy(true);
    const res = await confirmPresence(result.target, result.tournamentId);
    setBusy(false);

    if ('error' in res && res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${result.fullName} pointé présent.`);
    setResult({ ...result, checkedIn: true, checkedInAt: new Date().toISOString() });
  }

  function reset() {
    lastScanRef.current = '';
    setResult(null);
    setManual('');
  }

  return (
    <div className="space-y-5">
      {/* ── Caméra ─────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="relative aspect-[4/3] w-full bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn('size-full object-cover', !scanning && 'opacity-0')}
          />
          <canvas ref={canvasRef} className="hidden" />

          {scanning && (
            <>
              {/* Viseur */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="relative size-52 max-w-[65%]">
                  {['left-0 top-0 border-l-2 border-t-2', 'right-0 top-0 border-r-2 border-t-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c) => (
                    <span key={c} className={cn('absolute size-8 border-rage-orange', c)} />
                  ))}
                </div>
              </div>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white/70 backdrop-blur">
                Vise le QR code du joueur
              </span>
            </>
          )}

          {!scanning && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <Camera className="mx-auto mb-3 size-10 text-white/20" />
                <p className="text-sm text-white/50">
                  {cameraError ?? 'Caméra éteinte'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.07] p-4">
          <button
            onClick={scanning ? stop : start}
            className={cn(
              'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all',
              scanning
                ? 'border border-white/12 text-white/70 hover:bg-white/5'
                : 'bg-rage-gradient text-black shadow-neon hover:brightness-110',
            )}
          >
            {scanning ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {scanning ? 'Arrêter la caméra' : 'Scanner un QR code'}
          </button>
        </div>
      </div>

      {/* ── Saisie manuelle ────────────────────────────────── */}
      <div className="glass-card p-4">
        <label className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          <Keyboard className="size-3.5" />
          Ou saisis la référence
        </label>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manual.trim()) {
                lastScanRef.current = '';
                void handleReference(manual);
              }
            }}
            placeholder="RAGE-7K2M9Q"
            autoCapitalize="characters"
            className="h-12 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 font-mono text-sm uppercase tracking-widest text-white placeholder:text-white/25 focus:border-rage-orange/60 focus:outline-none"
          />
          <button
            onClick={() => {
              lastScanRef.current = '';
              void handleReference(manual);
            }}
            disabled={!manual.trim() || busy}
            className="h-12 rounded-xl bg-rage-gradient px-5 text-sm font-bold text-black shadow-neon disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : 'Chercher'}
          </button>
        </div>
      </div>

      {/* ── Résultat ───────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.kind + ('reference' in result ? result.reference : '')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {result.kind === 'NOT_FOUND' && (
              <Panel tone="error" icon={XCircle} title="Référence inconnue">
                <p className="font-mono text-sm tracking-widest text-white/60">
                  {result.reference}
                </p>
                <p className="mt-2 text-sm">
                  Aucun participant ne correspond. Vérifie la saisie ou cherche le joueur par
                  son nom dans le check-in.
                </p>
              </Panel>
            )}

            {result.kind === 'FORBIDDEN' && (
              <Panel tone="warn" icon={ShieldAlert} title="Tournoi non assigné">
                <p className="text-sm">
                  Ce joueur participe à <strong className="text-white">{result.tournamentName}</strong>,
                  auquel tu n&apos;es pas assigné.
                </p>
                <p className="mt-3 text-sm">
                  Merci de voir{' '}
                  <strong className="text-white">
                    {result.contacts.length > 0 ? result.contacts.join(', ') : 'un administrateur'}
                  </strong>{' '}
                  pour valider sa présence.
                </p>
              </Panel>
            )}

            {result.kind === 'OK' && (
              <div className="glass-card overflow-hidden">
                <div
                  className={cn(
                    'flex items-center gap-3 px-5 py-3',
                    result.checkedIn
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rage-orange/10 text-rage-orange',
                  )}
                >
                  {result.checkedIn ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <Ticket className="size-5" />
                  )}
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {result.checkedIn ? 'Déjà pointé présent' : 'Prêt à pointer'}
                  </span>
                </div>

                <div className="px-5 py-4">
                  <p className="font-display text-2xl font-bold text-white">{result.pseudo}</p>
                  <p className="text-sm text-white/45">{result.fullName}</p>
                  <p className="mt-1 font-mono text-xs tracking-widest text-white/30">
                    {result.reference}
                  </p>

                  <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-sm">
                    <Row label="Tournoi" value={result.tournamentName} />
                    {result.teamName && (
                      <Row
                        label="Équipe"
                        value={`${result.teamName}${result.isCaptain ? ' (capitaine)' : ''}`}
                        icon={Users}
                      />
                    )}
                    {result.seatLabel && <Row label="Place" value={result.seatLabel} />}
                    <Row
                      label="Paiement"
                      value={result.paid ? 'Réglé' : `À encaisser — ${formatPrice(result.amountDueCents)}`}
                      tone={result.paid ? 'ok' : 'warn'}
                    />
                  </dl>
                </div>

                <div className="flex gap-2 border-t border-white/[0.07] p-4">
                  <button
                    onClick={reset}
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 px-4 text-sm font-semibold text-white/70 hover:bg-white/5"
                  >
                    <RotateCcw className="size-4" />
                    Suivant
                  </button>
                  <button
                    onClick={validate}
                    disabled={busy || result.checkedIn}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rage-gradient text-sm font-bold text-black shadow-neon transition-all hover:brightness-110 disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {result.checkedIn ? 'Déjà présent' : 'Valider la présence'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Panel({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: 'error' | 'warn';
  icon: typeof XCircle;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'glass-card border p-5',
        tone === 'error' ? 'border-rage-red/30' : 'border-rage-yellow/30',
      )}
    >
      <div
        className={cn(
          'mb-2 flex items-center gap-2 font-display text-lg font-bold',
          tone === 'error' ? 'text-rage-red' : 'text-rage-yellow',
        )}
      >
        <Icon className="size-5" />
        {title}
      </div>
      <div className="text-white/60">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: typeof Users;
  tone?: 'ok' | 'warn';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-white/40">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd
        className={cn(
          'text-right font-medium',
          tone === 'ok' ? 'text-emerald-400' : tone === 'warn' ? 'text-rage-yellow' : 'text-white',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
