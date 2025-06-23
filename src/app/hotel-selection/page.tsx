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
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Building, LogIn, PlusCircle } from 'lucide-react';

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
      const hotelRef = await addDoc(collection(db, 'hotels'), {
        name: createHotelName,
        adminUid: user.uid,
        createdAt: new Date(),
      });
      
      toast({
        title: 'Hotel Created!',
        description: `Your hotel "${createHotelName}" has been successfully created.`,
      });
      router.push(`/dashboard/${hotelRef.id}`);
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
            toast({
                title: "Joining Hotel...",
                description: `Redirecting you to the dashboard.`,
            });
            router.push(`/dashboard/${joinHotelId}`);
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
        <p>Loading user session...</p>
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
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={loading}>
                     {loading ? 'Joining...' : 'Join Hotel'}
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
