import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Transaction, Client } from "@/lib/types";
import { TransactionsClient } from './transactions-client';
import { notFound } from 'next/navigation';

async function getTransactions(hotelId: string): Promise<Transaction[]> {
    try {
        const transactionsQuery = query(
            collection(db, `hotels/${hotelId}/transactions`),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(transactionsQuery);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Transaction[];
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return [];
    }
}

async function getClients(hotelId: string): Promise<Client[]> {
    try {
        const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(clientsQuery);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Client[];
    } catch (error) {
        console.error("Failed to fetch clients:", error);
        return [];
    }
}

export default async function TransactionsPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }

  const [transactionsData, clientsData] = await Promise.all([
    getTransactions(params.hotelId),
    getClients(params.hotelId)
  ]);

  const transactions = transactionsData.map(t => ({
    ...t,
    createdAt: t.createdAt.toDate().toISOString(),
  }));

  const clientsForDropdown = clientsData.map(c => ({
      id: c.id, 
      name: c.name,
      partnerName: c.partnerName,
      partnerId: c.partnerId,
      allowance: c.allowance,
      debt: c.debt
  }));

  return (
    <div className="space-y-8">
      <TransactionsClient 
        initialTransactions={transactions} 
        clients={clientsForDropdown} 
        hotelId={params.hotelId}
      />
    </div>
  );
}
