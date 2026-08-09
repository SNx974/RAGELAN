/**
 * Fiche de présence PDF — @react-pdf/renderer.
 * Rendue côté serveur dans la route /api/admin/tournaments/[id]/attendance.pdf
 */
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export type AttendanceRow = {
  teamName: string | null;
  lastName: string;
  firstName: string;
  pseudo: string | null;
  ign: string | null;
  phone: string;
  seatLabel: string | null;
  paymentStatus: string;
  status: string;
};

export type AttendanceProps = {
  eventName: string;
  tournamentName: string;
  formatLabel: string;
  venue: string;
  generatedAt: string;
  rows: AttendanceRow[];
};

const RAGE_RED = '#FF2A2A';
const RAGE_ORANGE = '#FF6B00';
const INK = '#111111';
const MUTED = '#666666';
const LINE = '#DDDDDD';

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 44, paddingHorizontal: 28, fontSize: 9, color: INK },
  headerBar: { height: 5, backgroundColor: RAGE_RED, marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eventName: { fontSize: 8, letterSpacing: 2, color: RAGE_ORANGE, textTransform: 'uppercase' },
  title: { fontSize: 19, fontWeight: 'bold', marginTop: 2 },
  subtitle: { fontSize: 9, color: MUTED, marginTop: 3 },
  meta: { fontSize: 8, color: MUTED, textAlign: 'right' },

  summary: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 12,
    marginBottom: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
  summaryLabel: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 },
  summaryValue: { fontSize: 13, fontWeight: 'bold' },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F3F3',
    borderBottomWidth: 1,
    borderColor: '#BBBBBB',
    paddingVertical: 5,
    paddingHorizontal: 3,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  th: { fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.4 },

  cTeam: { width: '17%' },
  cName: { width: '21%' },
  cPseudo: { width: '15%' },
  cPhone: { width: '13%' },
  cSeat: { width: '11%' },
  cPay: { width: '11%' },
  cSign: { width: '12%' },

  seatBadge: { fontWeight: 'bold' },
  paid: { color: '#0A7A34', fontWeight: 'bold' },
  due: { color: RAGE_RED, fontWeight: 'bold' },
  signBox: { height: 16, borderWidth: 0.5, borderColor: '#AAAAAA', borderRadius: 2 },
  groupHeader: {
    marginTop: 8,
    marginBottom: 2,
    paddingVertical: 3,
    paddingHorizontal: 4,
    backgroundColor: '#FFF3E6',
    borderLeftWidth: 3,
    borderColor: RAGE_ORANGE,
  },
  groupTitle: { fontSize: 9, fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: MUTED,
    borderTopWidth: 0.5,
    borderColor: LINE,
    paddingTop: 5,
  },
});

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: 'À régler',
  PAID_ONLINE: 'Payé en ligne',
  PAY_ON_SITE: 'Sur place',
  PAID_ON_SITE: 'Payé sur place',
  REFUNDED: 'Remboursé',
};

function isPaid(status: string) {
  return status === 'PAID_ONLINE' || status === 'PAID_ON_SITE';
}

export function AttendanceSheet({
  eventName,
  tournamentName,
  formatLabel,
  venue,
  generatedAt,
  rows,
}: AttendanceProps) {
  // Regroupement par équipe ; les solos tombent dans un bloc dédié.
  const groups = new Map<string, AttendanceRow[]>();
  for (const row of rows) {
    const key = row.teamName ?? 'Joueurs solo';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const paidCount = rows.filter((r) => isPaid(r.paymentStatus)).length;

  return (
    <Document title={`Fiche de présence — ${tournamentName}`} author={eventName}>
      <Page size="A4" style={styles.page} orientation="portrait">
        <View style={styles.headerBar} fixed />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eventName}>{eventName}</Text>
            <Text style={styles.title}>Fiche de présence — {tournamentName}</Text>
            <Text style={styles.subtitle}>{formatLabel}</Text>
          </View>
          <View>
            <Text style={styles.meta}>{venue}</Text>
            <Text style={styles.meta}>Éditée le {generatedAt}</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>Inscrits</Text>
            <Text style={styles.summaryValue}>{rows.length}</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Équipes</Text>
            <Text style={styles.summaryValue}>{groups.size}</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Réglés</Text>
            <Text style={styles.summaryValue}>
              {paidCount}/{rows.length}
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader} fixed>
          <Text style={[styles.th, styles.cTeam]}>Équipe</Text>
          <Text style={[styles.th, styles.cName]}>Nom / Prénom</Text>
          <Text style={[styles.th, styles.cPseudo]}>Pseudo / IGN</Text>
          <Text style={[styles.th, styles.cPhone]}>Téléphone</Text>
          <Text style={[styles.th, styles.cSeat]}>Place</Text>
          <Text style={[styles.th, styles.cPay]}>Paiement</Text>
          <Text style={[styles.th, styles.cSign]}>Signature</Text>
        </View>

        {Array.from(groups.entries()).map(([groupName, members]) => (
          <View key={groupName} wrap={false}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>
                {groupName} · {members.length} joueur{members.length > 1 ? 's' : ''}
              </Text>
            </View>
            {members.map((r, i) => (
              <View key={`${groupName}-${i}`} style={styles.row}>
                <Text style={styles.cTeam}>{r.teamName ?? '—'}</Text>
                <Text style={styles.cName}>
                  {r.lastName.toUpperCase()} {r.firstName}
                </Text>
                <Text style={styles.cPseudo}>{r.ign ?? r.pseudo ?? '—'}</Text>
                <Text style={styles.cPhone}>{r.phone}</Text>
                <Text style={[styles.cSeat, styles.seatBadge]}>{r.seatLabel ?? '—'}</Text>
                <Text style={[styles.cPay, isPaid(r.paymentStatus) ? styles.paid : styles.due]}>
                  {PAYMENT_LABEL[r.paymentStatus] ?? r.paymentStatus}
                </Text>
                <View style={styles.cSign}>
                  <View style={styles.signBox} />
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>
            {eventName} · {tournamentName}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
