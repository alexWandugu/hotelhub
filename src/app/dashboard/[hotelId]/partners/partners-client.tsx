'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addPartner } from '@/lib/actions';
import type { Partner } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, PlusCircle } from 'lucide-react';


// The data from server component has createdAt serialized to a string
type SerializablePartner = Omit<Partner, 'createdAt'> & {
    createdAt: string;
};

interface PartnersClientProps {
    initialPartners: SerializablePartner[];
    hotelId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Adding...' : 'Add Partner'}
        </Button>
    );
}

export function PartnersClient({ initialPartners, hotelId }: PartnersClientProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const addPartnerWithHotelId = addPartner.bind(null, hotelId);
    const [state, dispatch] = useActionState(addPartnerWithHotelId, { errors: null, message: null });

    useEffect(() => {
        if (state.message) {
            if (state.errors) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: state.message,
                });
            } else {
                toast({
                    title: 'Success!',
                    description: state.message,
                });
                setOpen(false);
                formRef.current?.reset();
            }
        }
    }, [state, toast]);
    
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return format(date, 'PPP');
    };

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Your Partners</CardTitle>
                    <CardDescription>A list of all your partner companies.</CardDescription>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Partner
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Add New Partner</DialogTitle>
                            <DialogDescription>
                                Enter the details of the new partner company.
                            </DialogDescription>
                        </DialogHeader>
                        <form action={dispatch} ref={formRef} className="space-y-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input id="name" name="name" className="col-span-3" required />
                                {state?.errors?.name && <p className="col-span-4 text-sm text-destructive text-right -mt-2">{state.errors.name[0]}</p>}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <SubmitButton />
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {initialPartners.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Partner Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date Joined</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialPartners.map((partner) => (
                                    <TableRow key={partner.id}>
                                        <TableCell className="font-medium">{partner.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>
                                                {partner.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(partner.createdAt)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 md:p-16 bg-secondary rounded-lg">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="font-semibold">No Partners Found</p>
                        <p className="text-sm text-muted-foreground">Get started by adding your first partner company.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
