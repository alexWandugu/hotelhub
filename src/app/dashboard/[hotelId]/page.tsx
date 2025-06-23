'use client';

import { useParams } from 'next/navigation';
import AdminDashboard from './admin-dashboard';

export default function DashboardPage() {
  const params = useParams<{ hotelId: string }>();

  // This page is now admin-only.
  // The layout will redirect members to their dedicated page.
  return <AdminDashboard hotelId={params.hotelId} />;
}
