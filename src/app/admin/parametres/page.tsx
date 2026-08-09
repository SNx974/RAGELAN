import { prisma } from '@/lib/prisma';
import { EventSettingsForm } from '@/components/admin/event-settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await prisma.eventSettings.findUnique({ where: { id: 1 } });

  const [tournaments, users, teams, registrations] = await Promise.all([
    prisma.tournament.count(),
    prisma.user.count(),
    prisma.team.count(),
    prisma.registration.count(),
  ]);

  return (
    <EventSettingsForm
      settings={{
        eventName: settings?.eventName ?? 'R.A.G.E LAN 2',
        venueName: settings?.venueName ?? '',
        venueAddress: settings?.venueAddress ?? '',
        registrationsOpen: settings?.registrationsOpen ?? true,
      }}
      counts={{ tournaments, users, teams, registrations }}
    />
  );
}
