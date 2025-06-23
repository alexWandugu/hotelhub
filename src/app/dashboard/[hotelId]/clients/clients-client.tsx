'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addClient } from '@/lib/actions';
import type { Client, Partner } from '@/lib/types';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, PlusCircle, AlertTriangle, Loader2, Building2, PieChart } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';

type SerializableClient = Omit<Client, 'createdAt'> & { createdAt: string; };
type SerializablePartner = Omit<Partner, 'createdAt'> & { createdAt: string; };

interface PartnerWithClients extends SerializablePartner {
  clients: SerializableClient[];
}

interface ClientsClientProps {
    partnersWithClients: PartnerWithClients[];
    partnersForDropdown: { id: string; name: string }[];
    hotelId: string;
    totalUsedSlots: number;
    totalSponsoredSlots: number;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Client'}
        </Button>
    );
}

export function ClientsClient({ 
    partnersWithClients, 
    partnersForDropdown, 
    hotelId, 
    totalUsedSlots, 
    totalSponsoredSlots 
}: ClientsClientProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const addClientWithHotelId = addClient.bind(null, hotelId);
    const [state, dispatch] = useActionState(addClientWithHotelId, { errors: null, message: null });

    useEffect(() => {
        if (state.message) {
            if (state.errors) {
                // Form-specific errors are displayed in the dialog
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
    
    const capacityPercentage = totalSponsoredSlots > 0 ? (totalUsedSlots / totalSponsoredSlots) * 100 : 0;

    return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnersForDropdown.length}</div>
            <p className="text-xs text-muted-foreground">companies providing clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsedSlots}</div>
            <p className="text-xs text-muted-foreground">active clients being served</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Capacity</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsedSlots} / {totalSponsoredSlots}</div>
            <Progress value={capacityPercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Clients by Partner</CardTitle>
                    <CardDescription>A breakdown of clients from each partner company.</CardDescription>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto" disabled={partnersForDropdown.length === 0}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Client</DialogTitle>
                            <DialogDescription>
                                {partnersForDropdown.length > 0 ? "Enter the details of the new client." : "You must add a partner company before adding clients."}
                            </DialogDescription>
                        </DialogHeader>
                        {partnersForDropdown.length > 0 && (
                            <form action={dispatch} ref={formRef} className="space-y-4 pt-4">
                                {state?.errors?._form && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Validation Error</AlertTitle>
                                        <AlertDescription>
                                            {state.errors._form[0]}
                                        </AlertDescription>
                                    </Alert>
                                )}
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
                                            {partnersForDropdown.map(partner => (
                                                <SelectItem key={partner.id} value={`${partner.id}|${partner.name}`}>
                                                    {partner.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {state?.errors?.partner && <p className="text-sm text-destructive">{state.errors.partner[0]}</p>}
                                </div>
                                <p className="text-xs text-muted-foreground pt-2">
                                  The meal allowance will be automatically calculated based on the partner's agreement.
                                </p>
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
                {partnersWithClients.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                        {partnersWithClients.map((partner) => (
                            <AccordionItem value={partner.id} key={partner.id}>
                                <AccordionTrigger className="hover:no-underline px-2">
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-base">{partner.name}</span>
                                        <Badge variant="secondary" className="text-sm">
                                            {partner.clients.length} / {partner.sponsoredEmployeesCount} Clients
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {partner.clients.length > 0 ? (
                                        <div className="rounded-md border mt-2">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Client Name</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Allowance</TableHead>
                                                        <TableHead>Date Added</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {partner.clients.map((client) => (
                                                        <TableRow key={client.id}>
                                                            <TableCell className="font-medium">{client.name}</TableCell>
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
                                        <div className="text-center text-sm text-muted-foreground py-8">
                                            No clients have been added for this partner yet.
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 md:p-16 bg-secondary rounded-lg">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="font-semibold">No Partners Found</p>
                        <p className="text-sm text-muted-foreground">Get started by adding a partner company first.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
    );
}