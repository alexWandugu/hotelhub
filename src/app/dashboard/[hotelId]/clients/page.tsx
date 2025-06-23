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
  
  const clientsData = await getClients(params.hotelId);
  const partnersData = await getPartners(params.hotelId);

  const clients = clientsData.map(client => ({
    ...client,
    // Convert timestamp to a serializable format (ISO string)
    createdAt: client.createdAt.toDate().toISOString(),
  }));

  // We only need id and name for the dropdown, no need to serialize other fields
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
        initialClients={clients} 
        partners={partnersForDropdown} 
        hotelId={params.hotelId} 
      />
    </div>
  );
}
