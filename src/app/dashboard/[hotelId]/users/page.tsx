'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { manageUserStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { HotelUser } from '@/lib/types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Bell, Check, UserCheck, Users, X } from 'lucide-react';

export default function UsersPage() {
  const params = useParams<{ hotelId: string }>();
  const hotelId = params.hotelId;
  const { toast } = useToast();

  const [users, setUsers] = useState<HotelUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);
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
        return 0;
      });
      
      setUsers(fetchedUsers);
    } catch (err: any) {
      setError('Failed to load user data. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [hotelId, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (
    targetUserId: string,
    action: 'approve' | 'deny'
  ) => {
    try {
      await manageUserStatus(hotelId, targetUserId, action);
      toast({
        title: 'Success',
        description: `User has been ${action === 'approve' ? 'approved' : 'denied'}.`,
      });
      // Data will be refetched automatically due to revalidatePath in the server action
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: err.message,
      });
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeUsers = users.filter((u) => u.status === 'active');

  const renderSkeleton = () => (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
       <Card className="border-destructive">
         <CardHeader>
           <CardTitle className="flex items-center gap-2 text-destructive">
             <AlertTriangle/> Error
           </CardTitle>
           <CardDescription className="text-destructive/80">
             Could not load user data.
           </CardDescription>
         </CardHeader>
         <CardContent>
           <p>{error}</p>
            <Button onClick={fetchUsers} className="mt-4">Retry</Button>
         </CardContent>
       </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
        <p className="text-muted-foreground">
          Approve pending requests and manage user access for your hotel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            These users are waiting for approval to access the hotel dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            renderSkeleton()
          ) : pendingUsers.length > 0 ? (
            <UserTable users={pendingUsers} onAction={handleAction} />
          ) : (
             <div className="flex flex-col items-center justify-center text-center p-8 bg-secondary rounded-lg">
                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="font-semibold">All Clear!</p>
                <p className="text-sm text-muted-foreground">There are no pending join requests.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Users
          </CardTitle>
          <CardDescription>
            These users currently have active access to the hotel dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            renderSkeleton()
          ) : activeUsers.length > 0 ? (
            <UserTable users={activeUsers} onAction={handleAction} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-secondary rounded-lg">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="font-semibold">No Active Users</p>
                <p className="text-sm text-muted-foreground">Once approved, users will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserTable({
  users,
  onAction,
}: {
  users: HotelUser[];
  onAction: (userId: string, action: 'approve' | 'deny') => void;
}) {
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const handleActionClick = (userId: string, action: 'approve' | 'deny') => {
    setSubmitting(prev => ({ ...prev, [`${userId}-${action}`]: true }));
    onAction(userId, action);
    // No need to set submitting to false, as the component will re-render
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell className="capitalize">{user.role}</TableCell>
              <TableCell>
                <Badge
                  variant={user.status === 'active' ? 'default' : 'secondary'}
                >
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {user.status === 'pending' && (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleActionClick(user.id, 'approve')}
                      disabled={submitting[`${user.id}-approve`]}
                    >
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleActionClick(user.id, 'deny')}
                       disabled={submitting[`${user.id}-deny`]}
                    >
                      <X className="mr-2 h-4 w-4" /> Deny
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
