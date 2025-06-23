
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The /dashboard route is no longer valid.
// This page redirects users to the hotel selection screen.
export default function DashboardRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/hotel-selection');
  }, [router]);

  return null; 
}
