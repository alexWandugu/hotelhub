'use client';

import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart,
  Bot,
  Building2,
  Handshake,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ hotelId: string }>();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/');
      return;
    }

    const checkAuthorization = async () => {
      if (!params.hotelId || !user.uid) return;

      try {
        const userDocRef = doc(db, 'hotels', params.hotelId, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().status === 'active') {
          setIsAuthorized(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Unauthorized Access',
            description: "You don't have permission for this hotel dashboard.",
          });
          router.replace('/hotel-selection');
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to verify your access. Please try again.',
        });
        router.replace('/hotel-selection');
      }
    };

    checkAuthorization();
  }, [user, authLoading, params.hotelId, router, toast]);

  const navItems = [
    { href: `/dashboard/${params.hotelId}`, icon: AreaChart, label: 'Dashboard' },
    { href: `/dashboard/${params.hotelId}/transactions`, icon: Handshake, label: 'Transactions' },
    { href: `/dashboard/${params.hotelId}/ai-report`, icon: Bot, label: 'AI Report' },
    { href: `/dashboard/${params.hotelId}/partners`, icon: Building2, label: 'Partners' },
    { href: `/dashboard/${params.hotelId}/clients`, icon: Users, label: 'Clients' },
    { href: `/dashboard/${params.hotelId}/users`, icon: Settings, label: 'Manage Users' },
  ];

  const isNavItemActive = (href: string) => {
    if (href === `/dashboard/${params.hotelId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
           <div className="flex items-center gap-2 text-foreground">
             <Building2 className="h-8 w-8" />
             <span className="text-xl font-bold">Verifying Access...</span>
           </div>
           <Skeleton className="h-4 w-64" />
           <Skeleton className="h-4 w-56" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Building2 className="h-7 w-7 text-primary" />
            <h2 className="text-xl font-bold font-headline">Hotel Hub</h2>
          </div>
          <div className="hidden items-center gap-2 group-data-[collapsible=icon]:flex">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={isNavItemActive(item.href)}
                    tooltip={{ children: item.label }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator />
        <div className="p-4">
          <Button variant="outline" className="w-full group-data-[collapsible=icon]:hidden" onClick={() => router.push('/')}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
          <Button variant="ghost" size="icon" className="hidden w-full group-data-[collapsible=icon]:flex" onClick={() => router.push('/')}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:justify-end">
          <SidebarTrigger className="md:hidden" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="@shadcn" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/hotel-selection')}>
                <Building2 className="mr-2 h-4 w-4" />
                <span>Switch Hotel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/')}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
