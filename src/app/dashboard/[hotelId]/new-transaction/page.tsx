import NewTransactionClient from './new-transaction-client';
import type { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import type { Transaction, Client, Partner } from "@/lib/types";
import { notFound } from 'next/navigation';

type SerializableTransaction = Omit<Transaction, 'createdAt'> & { createdAt: string };
interface ClientForDropdown {
  id: string;
  name: string;
  partnerName: string;
  partnerId: string;
  periodAllowance: number;
  utilizedAmount: number;
  debt: number;
}

async function getInitialData(hotelId: string): Promise<{
    initialTransactions: SerializableTransaction[];
    initialClients: ClientForDropdown[];
}> {
    try {
        const partnersQuery = db.collection(`hotels/${hotelId}/partners`).where('lastPeriodStartedAt', '!=', null);
        const partnersSnapshot = await partnersQuery.get();
        const activePartnerIds = partnersSnapshot.docs.map(p => p.id);

        let initialClients: ClientForDropdown[] = [];
        if (activePartnerIds.length > 0) {
            const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', 'in', activePartnerIds);
            const clientsSnapshot = await clientsQuery.get();
            initialClients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client))
                .map(c => ({
                    id: c.id, 
                    name: c.name,
                    partnerName: c.partnerName,
                    partnerId: c.partnerId,
                    periodAllowance: Number(c.periodAllowance || 0),
                    utilizedAmount: Number(c.utilizedAmount || 0),
                    debt: Number(c.debt || 0),
                }));
            initialClients.sort((a, b) => a.name.localeCompare(b.name));
        }

        const transactionsQuery = db.collection(`hotels/${hotelId}/transactions`).orderBy('createdAt', 'desc');
        const transactionsSnapshot = await transactionsQuery.get();
        const initialTransactions = transactionsSnapshot.docs.map(doc => {
            const data = doc.data() as Transaction;
            return {
                ...data,
                id: doc.id,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString()
            };
        }) as SerializableTransaction[];

        return { initialClients, initialTransactions };

    } catch (error) {
        console.error("Error fetching initial data for new transaction page:", error);
        return { initialClients: [], initialTransactions: [] };
    }
}

export default async function NewTransactionPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }
  const { initialTransactions, initialClients } = await getInitialData(params.hotelId);
  
  return (
      <NewTransactionClient 
          hotelId={params.hotelId}
          initialTransactions={initialTransactions}
          initialClients={initialClients}
      />
  );
}
