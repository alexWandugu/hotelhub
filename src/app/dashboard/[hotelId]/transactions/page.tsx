import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Transaction, Client, Partner } from "@/lib/types";
import { TransactionsClient } from './transactions-client';
import { notFound } from 'next/navigation';

async function getTransactions(hotelId: string): Promise<Transaction[]> {
    try {
        const transactionsQuery = db
            .collection(`hotels/${hotelId}/transactions`)
            .orderBy('createdAt', 'desc');
        const querySnapshot = await transactionsQuery.get();
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
        const clientsQuery = db.collection(`hotels/${hotelId}/clients`).orderBy('name', 'asc');
        const querySnapshot = await clientsQuery.get();
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Client[];
    } catch (error) {
        console.error("Failed to fetch clients:", error);
        return [];
    }
}

async function getPartners(hotelId: string): Promise<Partner[]> {
    try {
        const partnersQuery = db.collection(`hotels/${hotelId}/partners`);
        const querySnapshot = await partnersQuery.get();
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

export default async function TransactionsPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }

  const [transactionsData, clientsData, partnersData] = await Promise.all([
    getTransactions(params.hotelId),
    getClients(params.hotelId),
    getPartners(params.hotelId)
  ]);

  const transactions = transactionsData.map(t => ({
    ...t,
    createdAt: (t.createdAt as Timestamp).toDate().toISOString(),
  }));

  const partnersWithActivePeriodIds = partnersData
    .filter(p => p.lastPeriodStartedAt)
    .map(p => p.id);

  const clientsForDropdown = clientsData
    .filter(c => partnersWithActivePeriodIds.includes(c.partnerId))
    .map(c => ({
      id: c.id, 
      name: c.name,
      partnerName: c.partnerName,
      partnerId: c.partnerId,
      periodAllowance: Number(c.periodAllowance || 0),
      utilizedAmount: Number(c.utilizedAmount || 0),
      debt: Number(c.debt || 0),
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
