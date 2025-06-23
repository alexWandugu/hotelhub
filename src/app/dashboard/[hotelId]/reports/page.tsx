import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ReportsClient } from './reports-client';
import type { Client, Partner } from '@/lib/types';
import { notFound } from 'next/navigation';

async function getReportData(hotelId: string) {
    try {
        const partnersQuery = query(collection(db, `hotels/${hotelId}/partners`));
        const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), where('debt', '>', 0));

        const [partnersSnapshot, clientsSnapshot] = await Promise.all([
            getDocs(partnersQuery),
            getDocs(clientsQuery)
        ]);

        const partners = partnersSnapshot.docs.map(doc => {
            const data = doc.data() as Partner;
            return {
                id: doc.id,
                name: data.name,
            };
        });

        const indebtedClients = clientsSnapshot.docs.map(doc => {
            const data = doc.data() as Client;
            return {
                id: doc.id,
                name: data.name,
                partnerId: data.partnerId,
                partnerName: data.partnerName,
                debt: Number(data.debt || 0),
            };
        });

        return { partners, indebtedClients };

    } catch (error) {
        console.error("Failed to fetch report data:", error);
        return { partners: [], indebtedClients: [] };
    }
}

export default async function ReportsPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }

  const { partners, indebtedClients } = await getReportData(params.hotelId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Reports</h1>
        <p className="text-muted-foreground">
          Generate and print reports for clients with outstanding debt and partner billing periods.
        </p>
      </div>
      <ReportsClient
        hotelId={params.hotelId}
        partners={partners}
        initialIndebtedClients={indebtedClients}
      />
    </div>
  );
}
