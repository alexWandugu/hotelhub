import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ClientsClient } from './clients-client';
import type { Client, Partner } from '@/lib/types';
import { notFound } from 'next/navigation';

async function getClients(hotelId: string): Promise<Client[]> {
    try {
        const clientsQuery = query(
            collection(db, `hotels/${hotelId}/clients`),
            orderBy('createdAt', 'desc')
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

async function getPartners(hotelId: string): Promise<Partner[]> {
    try {
        const partnersQuery = query(
            collection(db, `hotels/${hotelId}/partners`)
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

export default async function ClientsPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }
  
  const [clientsData, partnersData] = await Promise.all([
      getClients(params.hotelId),
      getPartners(params.hotelId)
  ]);

  const serializedClients = clientsData.map(client => ({
    ...client,
    createdAt: client.createdAt.toDate().toISOString(),
    // Ensure numeric values for calculations
    periodAllowance: Number(client.periodAllowance || 0),
    utilizedAmount: Number(client.utilizedAmount || 0),
    debt: Number(client.debt || 0),
  }));

  const serializedPartners = partnersData.map(partner => ({
    ...partner,
    createdAt: partner.createdAt.toDate().toISOString(),
    lastPeriodStartedAt: partner.lastPeriodStartedAt
      ? partner.lastPeriodStartedAt.toDate().toISOString()
      : undefined,
  }));

  const totalSponsoredSlots = serializedPartners.reduce((acc, p) => acc + p.sponsoredEmployeesCount, 0);
  const totalUsedSlots = serializedClients.length;

  const partnersWithClients = serializedPartners.map(partner => ({
      ...partner,
      clients: serializedClients.filter(client => client.partnerId === partner.id)
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const partnersForDropdown = partnersData.map(p => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Clients</h1>
        <p className="text-muted-foreground">
          Manage clients associated with your partners.
        </p>
      </div>
      <ClientsClient 
        partnersWithClients={partnersWithClients} 
        partnersForDropdown={partnersForDropdown} 
        hotelId={params.hotelId}
        totalUsedSlots={totalUsedSlots}
        totalSponsoredSlots={totalSponsoredSlots}
      />
    </div>
  );
}
