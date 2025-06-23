
'use client';

// This layout is neutralized to prevent conflicts with the dynamic [hotelId] layout.
export default function ObsoleteDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
