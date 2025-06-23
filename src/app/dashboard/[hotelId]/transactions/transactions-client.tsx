'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addTransaction } from '@/lib/actions';
import type { Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './data-table';
import { columns } from './columns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from "@/components/ui/select";
import { PlusCircle, AlertTriangle, Loader2 } from 'lucide-react';


type SerializableTransaction = Omit<Transaction, 'createdAt'> & { createdAt: string };
interface ClientForDropdown {
  id: string;
  name: string;
  partnerName: string;
  availableAllowance: number;
}
interface TransactionsClientProps {
    initialTransactions: SerializableTransaction[];
    clients: ClientForDropdown[];
    hotelId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</> : 'Record Transaction'}
        </Button>
    );
}

export function TransactionsClient({ initialTransactions, clients, hotelId }: TransactionsClientProps) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const addTransactionWithHotelId = addTransaction.bind(null, hotelId);
    const [state, dispatch] = useActionState(addTransactionWithHotelId, { errors: null, message: null });

    useEffect(() => {
        if (state.message) {
            if (state.errors) {
                // Errors shown inline
            } else {
                toast({ title: 'Success!', description: state.message });
                setDialogOpen(false);
                formRef.current?.reset();
            }
        }
    }, [state, toast]);
    
    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number') return 'N/A';
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);
    };

    return (
        <>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Transactions</h1>
                    <p className="text-muted-foreground">
                    View and manage all client transactions.
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto" disabled={clients.length === 0}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Transaction
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Record New Transaction</DialogTitle>
                            <DialogDescription>
                                {clients.length > 0 ? "Select a client and enter the transaction amount." : "You must add a client before you can record a transaction."}
                            </DialogDescription>
                        </DialogHeader>
                        {clients.length > 0 && (
                            <form action={dispatch} ref={formRef} className="space-y-4 pt-4">
                                {state?.errors?._form && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{state.errors._form[0]}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="client">Client</Label>
                                    <Select name="client" required>
                                        <SelectTrigger id="client">
                                            <SelectValue placeholder="Select a client" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map(client => (
                                                <SelectItem key={client.id} value={client.id}>
                                                    <div className="flex justify-between w-full">
                                                        <span>{client.name} <span className="text-muted-foreground text-xs">({client.partnerName})</span></span>
                                                        <span className="font-mono text-xs">{formatCurrency(client.availableAllowance)}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {state?.errors?.client && <p className="text-sm text-destructive">{state.errors.client[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount (KES)</Label>
                                    <Input id="amount" name="amount" type="number" placeholder="0.00" step="0.01" required min="0" />
                                    {state?.errors?.amount && <p className="text-sm text-destructive">{state.errors.amount[0]}</p>}
                                </div>
                                <DialogFooter className="pt-4">
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <SubmitButton />
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            <DataTable columns={columns} data={initialTransactions} />
        </>
    );
}
