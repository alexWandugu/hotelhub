'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Building2 } from 'lucide-react';
import AdminDashboard from './admin-dashboard';
import MemberDashboard from './member-dashboard';

export default function DashboardPage() {
  const params = useParams<{ hotelId: string }>();
  const [user, authLoading] = useAuthState(auth);
  const [role, setRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (authLoading || !user || !params.hotelId) {
        if (!authLoading) setLoading(false);
        return;
      }
      
      try {
        const userDocRef = doc(db, 'hotels', params.hotelId, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, authLoading, params.hotelId]);

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <Building2 className="h-10 w-10 animate-pulse text-primary" />
           <p className="text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (role === 'admin') {
    return <AdminDashboard hotelId={params.hotelId} />;
  }
  
  if (role === 'member') {
    return <MemberDashboard hotelId={params.hotelId} />;
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <p className="text-muted-foreground">Could not determine user role or access has been revoked.</p>
    </div>
  )
}
