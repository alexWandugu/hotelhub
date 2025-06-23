import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PartnersClient } from './partners-client';
import type { Partner } from '@/lib/types';
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


export default async function PartnersPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }
  const partnersData = await getPartners(params.hotelId);

  const partners = partnersData.map(partner => ({
    ...partner,
    // Convert timestamp to a serializable format (ISO string)
    createdAt: partner.createdAt.toDate().toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Partners</h1>
        <p className="text-muted-foreground">
          Manage your partner companies.
        </p>
      </div>
      <PartnersClient initialPartners={partners} hotelId={params.hotelId} />
    </div>
  );
}
