
import { db } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';
import type { Transaction, Client } from "@/lib/types";
import { TransactionsClient } from './transactions-client';
import { notFound } from 'next/navigation';

async function getTransactions(hotelId: string): Promise<(Omit<Transaction, 'createdAt'> & { createdAt: string })[]> {
    try {
        const transactionsQuery = db
            .collection(`hotels/${hotelId}/transactions`)
            .orderBy('createdAt', 'desc');
        const querySnapshot = await transactionsQuery.get();
        return querySnapshot.docs.map((doc) => {
            const data = doc.data() as Transaction;
            return {
                ...data,
                id: doc.id,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
            };
        });
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return [];
    }
}

async function getActiveClientsForDropdown(hotelId: string) {
    try {
        const partnersQuery = db.collection(`hotels/${hotelId}/partners`).where('lastPeriodStartedAt', '!=', null);
        const activePartnersSnapshot = await partnersQuery.get();
        
        if (activePartnersSnapshot.empty) {
            return [];
        }

        const activePartnerIds = activePartnersSnapshot.docs.map(p => p.id);

        const clientsQuery = db.collection(`hotels/${hotelId}/clients`).where('partnerId', 'in', activePartnerIds);
        const clientsSnapshot = await clientsQuery.get();
        
        return clientsSnapshot.docs.map(doc => {
            const c = doc.data() as Client;
            return {
                id: doc.id, 
                name: c.name,
                partnerName: c.partnerName,
                partnerId: c.partnerId,
                periodAllowance: Number(c.periodAllowance || 0),
                utilizedAmount: Number(c.utilizedAmount || 0),
                debt: Number(c.debt || 0),
            };
        });
    } catch (error) {
        console.error("Failed to fetch active clients:", error);
        return [];
    }
}


export default async function TransactionsPage({ params }: { params: { hotelId: string } }) {
  await params;
  if (!params.hotelId) {
    notFound();
  }

  const [transactions, clientsForDropdown] = await Promise.all([
    getTransactions(params.hotelId),
    getActiveClientsForDropdown(params.hotelId),
  ]);

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
