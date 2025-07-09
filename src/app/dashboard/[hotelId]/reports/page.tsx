import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-admin';
import { ReportsClient } from './reports-client';
import type { Client, Partner } from '@/lib/types';
import { notFound } from 'next/navigation';

async function getReportData(hotelId: string) {
    try {
        const partnersQuery = query(collection(db, `hotels/${hotelId}/partners`));
        const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), where('debt', '>', 0));

        const [partnersSnapshot, clientsSnapshot] = await Promise.all([
            getDocs(partnersQuery),
            getDocs(clientsSnapshot)
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

async function getHotelName(hotelId: string): Promise<string> {
    try {
        const hotelDocRef = doc(db, 'hotels', hotelId);
        const hotelDoc = await getDoc(hotelDocRef);
        if (hotelDoc.exists()) {
            return hotelDoc.data().name as string;
        }
        return 'Hotel Report';
    } catch (error) {
        console.error("Failed to fetch hotel name:", error);
        return 'Hotel Report';
    }
}


export default async function ReportsPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }

  const [reportData, hotelName] = await Promise.all([
      getReportData(params.hotelId),
      getHotelName(params.hotelId)
  ]);

  const { partners, indebtedClients } = reportData;

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
        hotelName={hotelName}
        partners={partners}
        initialIndebtedClients={indebtedClients}
      />
    </div>
  );
}
