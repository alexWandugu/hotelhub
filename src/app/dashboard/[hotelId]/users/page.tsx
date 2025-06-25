import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { HotelUser } from '@/lib/types';
import { UsersClient } from './users-client';
import { notFound } from 'next/navigation';

async function getUsers(hotelId: string): Promise<HotelUser[]> {
    try {
      const usersQuery = query(
        collection(db, `hotels/${hotelId}/users`),
        orderBy('requestedAt', 'desc')
      );
      const querySnapshot = await getDocs(usersQuery);
      const fetchedUsers = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as HotelUser[];

      // Sort to show pending users first
      fetchedUsers.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return 0; // Keep original sort for same-status users
      });
      
      return fetchedUsers;
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
    }
}

export default async function UsersPage({ params }: { params: { hotelId: string } }) {
  if (!params.hotelId) {
    notFound();
  }

  const usersData = await getUsers(params.hotelId);

  const users = usersData.map(user => ({
    ...user,
    joinedAt: user.joinedAt?.toDate().toISOString(),
    requestedAt: user.requestedAt?.toDate().toISOString(),
  }));

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeUsers = users.filter((u) => u.status === 'active');
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
        <p className="text-muted-foreground">
          Approve pending requests and manage user access for your hotel.
        </p>
      </div>

      <UsersClient 
        pendingUsers={pendingUsers} 
        activeUsers={activeUsers} 
        hotelId={params.hotelId}
      />
    </div>
  );
}
