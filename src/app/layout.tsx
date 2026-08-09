import type { Metadata, Viewport } from 'next';
import { Inter, Chakra_Petch } from 'next/font/google';
import { Toaster } from 'sonner';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { getSession } from '@/lib/auth';
import { getLogoSrc } from '@/lib/logo';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const chakra = Chakra_Petch({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'R.A.G.E LAN 2 — La LAN qui frappe fort',
    template: '%s · R.A.G.E LAN 2',
  },
  description:
    '9 tournois, 272 joueurs, un week-end. Valorant, Rocket League, TFT, Fortnite, TCG, SSBU, Mario Kart, Tekken 8 et FC27.',
  openGraph: {
    title: 'R.A.G.E LAN 2',
    description: '9 tournois. 272 places. Une seule LAN.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D0D0D',
  colorScheme: 'dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const logoSrc = getLogoSrc();

  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} ${chakra.variable} font-sans min-h-screen`}>
        <SiteHeader session={session} logoSrc={logoSrc} />
        <main className="min-h-[70vh]">{children}</main>
        <SiteFooter logoSrc={logoSrc} />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#141414',
              border: '1px solid rgba(255,107,0,.25)',
              color: '#fafafa',
            },
          }}
        />
      </body>
    </html>
  );
}
