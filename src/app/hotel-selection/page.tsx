'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Building, LogIn, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function HotelSelectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);
  const [loading, setLoading] = useState(false);
  
  const [createHotelName, setCreateHotelName] = useState('');
  const [joinHotelId, setJoinHotelId] = useState('');

  const handleCreateHotel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to create a hotel.',
      });
      return;
    }
    if (!createHotelName.trim()) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please enter a hotel name.",
        });
        return;
    }

    setLoading(true);
    try {
      const newHotelRef = doc(collection(db, 'hotels'));
      await runTransaction(db, async (transaction) => {
        transaction.set(newHotelRef, {
            name: createHotelName,
            adminUid: user.uid,
            createdAt: serverTimestamp(),
        });

        const userDocRef = doc(db, 'hotels', newHotelRef.id, 'users', user.uid);
        transaction.set(userDocRef, {
            email: user.email,
            role: 'admin',
            status: 'active',
            joinedAt: serverTimestamp(),
        });
      });
      
      toast({
        title: 'Hotel Created!',
        description: `Your hotel "${createHotelName}" has been successfully created.`,
      });
      router.push(`/dashboard/${newHotelRef.id}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHotel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
        toast({
            variant: "destructive",
            title: "Not Authenticated",
            description: "You must be logged in to join a hotel.",
        });
        return;
    }
    if (!joinHotelId.trim()) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please enter a Hotel ID.",
        });
        return;
    }
    setLoading(true);
    try {
        const hotelDocRef = doc(db, 'hotels', joinHotelId);
        const hotelDoc = await getDoc(hotelDocRef);

        if (hotelDoc.exists()) {
            const userDocRef = doc(db, 'hotels', joinHotelId, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.status === 'active') {
                    toast({
                        title: `Joining ${hotelDoc.data().name}...`,
                        description: "Welcome back!",
                    });
                    router.push(`/dashboard/${joinHotelId}`);
                } else if (userData.status === 'pending') {
                    toast({
                        title: "Request Pending",
                        description: "Your request to join this hotel is still awaiting approval.",
                    });
                } else {
                    toast({
                        variant: "destructive",
                        title: "Access Denied",
                        description: "You do not have permission to join this hotel.",
                    });
                }
            } else {
                await setDoc(userDocRef, {
                    email: user.email,
                    role: 'member',
                    status: 'pending',
                    requestedAt: serverTimestamp()
                });
                 toast({
                    title: "Request Sent!",
                    description: "Your request has been sent to the hotel admin for approval.",
                });
            }
        } else {
             toast({
                variant: "destructive",
                title: "Not Found",
                description: "No hotel found with that ID. Please check and try again.",
            });
        }
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Error Joining Hotel",
            description: error.message,
        });
    } finally {
        setLoading(false);
    }
  };
  
   if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
         <div className="flex flex-col items-center gap-4">
           <Logo />
           <Skeleton className="h-4 w-48 mt-2" />
           <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Hotel</TabsTrigger>
            <TabsTrigger value="join">Join Hotel</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Start a New Hotel</CardTitle>
                <CardDescription>
                  Create a new hotel workspace to manage your operations.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleCreateHotel}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotel-name">Hotel Name</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="hotel-name"
                        name="hotel-name"
                        placeholder="e.g., The Grand Budapest"
                        required
                        className="pl-10"
                        value={createHotelName}
                        onChange={(e) => setCreateHotelName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Hotel'}
                    <PlusCircle className="ml-2" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Join an Existing Hotel</CardTitle>
                <CardDescription>
                  Enter the Hotel ID provided by your administrator to join.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleJoinHotel}>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                    <Label htmlFor="hotel-id">Hotel ID</Label>
                    <div className="relative">
                      <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="hotel-id"
                        name="hotel-id"
                        placeholder="Enter Hotel ID"
                        required
                        className="pl-10"
                        value={joinHotelId}
                        onChange={(e) => setJoinHotelId(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                     {loading ? 'Processing...' : 'Join Hotel'}
                     <LogIn className="ml-2" />
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
