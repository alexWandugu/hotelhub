import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PartnersClient } from './partners-client';
import type { Partner, Client } from '@/lib/types';
import { notFound } from 'next/navigation';

async function getPartners(hotelId: string): Promise<Partner[]> {
    try {
        const partnersQuery = query(
            collection(db, `hotels/${hotelId}/partners`),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(partnersQuery);
        const partners = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Partner[];
        return partners;
    } catch (error) {
        console.error("Failed to fetch partners:", error);
        return [];
    }
}

async function getClients(hotelId: string): Promise<Client[]> {
    try {
        const clientsQuery = query(
            collection(db, `hotels/${hotelId}/clients`)
        );
        const querySnapshot = await getDocs(clientsQuery);
        const clients = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Client[];
        return clients;
    } catch (error) {
        console.error("Failed to fetch clients:", error);
        return [];
    }
}


export default async function PartnersPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }
  const [partnersData, clientsData] = await Promise.all([
      getPartners(params.hotelId),
      getClients(params.hotelId),
  ]);

  const partners = partnersData.map(partner => ({
    ...partner,
    createdAt: partner.createdAt.toDate().toISOString(),
    lastPeriodStartedAt: partner.lastPeriodStartedAt
      ? partner.lastPeriodStartedAt.toDate().toISOString()
      : undefined,
  }));
  
  const clients = clientsData.map(client => ({
    ...client,
    createdAt: client.createdAt.toDate().toISOString(),
  }));


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Partners</h1>
        <p className="text-muted-foreground">
          Manage your partner companies and their billing periods.
        </p>
      </div>
      <PartnersClient 
        initialPartners={partners} 
        initialClients={clients} 
        hotelId={params.hotelId} 
      />
    </div>
  );
}
