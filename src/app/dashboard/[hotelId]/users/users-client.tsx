'use client';

import { useState } from 'react';
import { manageUserStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { HotelUser as HotelUserWithTimestamp } from '@/lib/types';

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
import { Bell, Check, UserCheck, Users, X, Copy, Share2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type HotelUser = Omit<HotelUserWithTimestamp, 'joinedAt' | 'requestedAt'> & {
  joinedAt?: string;
  requestedAt?: string;
};


function UserTable({
  users,
  onAction,
}: {
  users: HotelUser[];
  onAction: (userId: string, action: 'approve' | 'deny') => void;
}) {
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  const handleActionClick = async (userId: string, action: 'approve' | 'deny') => {
    setSubmitting(prev => ({ ...prev, [`${userId}-${action}`]: true }));
    await onAction(userId, action);
    // Component will re-render due to server action revalidation, no need to set submitting to false.
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


interface UsersClientProps {
    pendingUsers: HotelUser[];
    activeUsers: HotelUser[];
    hotelId: string;
}

export function UsersClient({ pendingUsers, activeUsers, hotelId }: UsersClientProps) {
  const { toast } = useToast();

  const handleCopyId = () => {
    navigator.clipboard.writeText(hotelId);
    toast({
      title: "Copied!",
      description: "Hotel ID has been copied to your clipboard.",
    });
  };

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
      // The page will be revalidated by the server action
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: err.message,
      });
    }
  };

  return (
    <div className="space-y-8">
       <Alert>
        <Share2 className="h-4 w-4" />
        <AlertTitle>Share Your Hotel ID</AlertTitle>
        <AlertDescription>
          Give this ID to team members so they can request access to this hotel dashboard.
        </AlertDescription>
        <div className="mt-4 flex items-center gap-4 rounded-md bg-secondary p-3">
          <p className="flex-1 font-mono text-sm text-secondary-foreground truncate">{hotelId}</p>
          <Button variant="outline" size="sm" onClick={handleCopyId}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </Button>
        </div>
      </Alert>

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
          {pendingUsers.length > 0 ? (
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
          {activeUsers.length > 0 ? (
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
  )
}
