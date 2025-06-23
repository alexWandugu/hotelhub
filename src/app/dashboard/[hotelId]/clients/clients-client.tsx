'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addClient } from '@/lib/actions';
import type { Client } from '@/lib/types';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, PlusCircle } from 'lucide-react';

type SerializableClient = Omit<Client, 'createdAt'> & {
    createdAt: string;
};

interface ClientsClientProps {
    initialClients: SerializableClient[];
    partners: { id: string; name: string }[];
    hotelId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? 'Adding...' : 'Add Client'}
        </Button>
    );
}

export function ClientsClient({ initialClients, partners, hotelId }: ClientsClientProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const addClientWithHotelId = addClient.bind(null, hotelId);
    const [state, dispatch] = useActionState(addClientWithHotelId, { errors: null, message: null });

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

    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number') return 'N/A';
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);
    };

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Your Clients</CardTitle>
                    <CardDescription>A list of all clients from your partner companies.</CardDescription>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto" disabled={partners.length === 0}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Client</DialogTitle>
                            <DialogDescription>
                                {partners.length > 0 ? "Enter the details of the new client." : "You must add a partner company before adding clients."}
                            </DialogDescription>
                        </DialogHeader>
                        {partners.length > 0 && (
                            <form action={dispatch} ref={formRef} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Client Name</Label>
                                    <Input id="name" name="name" required />
                                    {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="partner">Partner Company</Label>
                                    <Select name="partner" required>
                                        <SelectTrigger id="partner">
                                            <SelectValue placeholder="Select a partner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {partners.map(partner => (
                                                <SelectItem key={partner.id} value={`${partner.id}|${partner.name}`}>
                                                    {partner.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {state?.errors?.partner && <p className="text-sm text-destructive">{state.errors.partner[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="allowance">Meal Allowance (KES)</Label>
                                    <Input id="allowance" name="allowance" type="number" placeholder="0.00" step="0.01" required min="0" />
                                    {state?.errors?.allowance && <p className="text-sm text-destructive">{state.errors.allowance[0]}</p>}
                                </div>

                                <DialogFooter className="pt-4">
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <SubmitButton />
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {initialClients.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client Name</TableHead>
                                    <TableHead>Partner Company</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Allowance</TableHead>
                                    <TableHead>Date Added</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialClients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.name}</TableCell>
                                        <TableCell>{client.partnerName}</TableCell>
                                        <TableCell>
                                            <Badge variant={client.status === 'active' ? 'default' : 'destructive'}>
                                                {client.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(client.allowance)}</TableCell>
                                        <TableCell>{formatDate(client.createdAt)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 md:p-16 bg-secondary rounded-lg">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="font-semibold">No Clients Found</p>
                        <p className="text-sm text-muted-foreground">Get started by adding your first client.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
