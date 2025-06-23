'use client';

import { useState, useEffect, useRef, useActionState, useMemo, useCallback, useTransition } from 'react';
import { addTransaction } from '@/lib/actions';
import type { Transaction, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '../transactions/data-table';
import { memberColumns } from '../transactions/member-columns';
import { cn } from '@/lib/utils';
import { collection, orderBy, query, onSnapshot, Unsubscribe, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusCircle, AlertTriangle, Loader2, ChevronsUpDown, Check, ShieldBan } from 'lucide-react';

// Type Definitions
type SerializableTransaction = Omit<Transaction, 'createdAt'> & { createdAt: string };
interface ClientForDropdown {
  id: string;
  name: string;
  partnerName: string;
  partnerId: string;
  periodAllowance: number;
  utilizedAmount: number;
  debt: number;
}

interface NewTransactionClientProps {
    hotelId: string;
    initialTransactions: SerializableTransaction[];
    initialClients: ClientForDropdown[];
}


// Submit Button Component
function SubmitButton({ disabled, pending, children }: { disabled: boolean, pending: boolean, children: React.ReactNode }) {
    return (
        <Button type="submit" disabled={pending || disabled}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                </>
            ) : (
                children
            )}
        </Button>
    );
}

export default function NewTransactionClient({ hotelId, initialClients, initialTransactions }: NewTransactionClientProps) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const formDataRef = useRef<FormData | null>(null);

    const [confirmDebtDialogOpen, setConfirmDebtDialogOpen] = useState(false);
    
    // Data State - initialized with server-fetched data
    const [transactions, setTransactions] = useState<SerializableTransaction[]>(initialTransactions);
    const [clients, setClients] = useState<ClientForDropdown[]>(initialClients);
    
    // Form state management
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [transactionAmount, setTransactionAmount] = useState('');
    
    // Server action state
    const [isPending, startTransition] = useTransition();
    const addTransactionWithHotelId = addTransaction.bind(null, hotelId);
    const [state, dispatch] = useActionState(addTransactionWithHotelId, { errors: null, message: null });

    const resetFormState = useCallback(() => {
        formRef.current?.reset();
        setSelectedPartnerId('');
        setSelectedClientId('');
        setTransactionAmount('');
        formDataRef.current = null;
    }, []);

    // Form submission feedback
    useEffect(() => {
        if (state.message) {
            if (state.errors) {
                // Errors shown inline
            } else {
                toast({ title: 'Success!', description: state.message });
                resetFormState();
            }
        }
    }, [state, toast, resetFormState]);
    
    // Real-time Updates
    useEffect(() => {
        let unsubscribes: Unsubscribe[] = [];

        // Clients listener
        const activePartnerIds = Array.from(new Set(initialClients.map(c => c.partnerId)));
        if (activePartnerIds.length > 0) {
            const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), where('partnerId', 'in', activePartnerIds));
            const clientsUnsub = onSnapshot(clientsQuery, (snapshot) => {
                const fetchedClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client))
                    .map(c => ({
                        id: c.id, 
                        name: c.name,
                        partnerName: c.partnerName,
                        partnerId: c.partnerId,
                        periodAllowance: Number(c.periodAllowance || 0),
                        utilizedAmount: Number(c.utilizedAmount || 0),
                        debt: Number(c.debt || 0),
                    }));
                fetchedClients.sort((a, b) => a.name.localeCompare(b.name));
                setClients(fetchedClients);
            });
            unsubscribes.push(clientsUnsub);
        }

        // Transactions listener
        const transactionsQuery = query(collection(db, `hotels/${hotelId}/transactions`), orderBy('createdAt', 'desc'));
        const transactionsUnsub = onSnapshot(transactionsQuery, (snapshot) => {
            const fetchedTransactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, createdAt: (doc.data().createdAt.toDate()).toISOString() })) as SerializableTransaction[];
            setTransactions(fetchedTransactions);
        });
        unsubscribes.push(transactionsUnsub);

        return () => unsubscribes.forEach(unsub => unsub());
    }, [hotelId, initialClients]);

    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number' || isNaN(amount)) return 'N/A';
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    // Derived data for UI logic
    const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
    const hasDebt = useMemo(() => (selectedClient?.debt ?? 0) > 0, [selectedClient]);
    const availableBalance = useMemo(() => (selectedClient?.periodAllowance ?? 0) - (selectedClient?.utilizedAmount ?? 0), [selectedClient]);
    const overage = useMemo(() => {
        const amount = parseFloat(transactionAmount);
        if (isNaN(amount) || !selectedClient || amount <= 0) return 0;
        return amount - availableBalance;
    }, [transactionAmount, availableBalance, selectedClient]);

    const isButtonDisabled = !selectedClientId || (parseFloat(transactionAmount) || 0) <= 0 || hasDebt || overage > 300;
    
    const partners = useMemo(() => {
        const partnerMap = new Map<string, { id: string; name: string }>();
        clients.forEach(client => {
            if (!partnerMap.has(client.partnerId)) {
                partnerMap.set(client.partnerId, { id: client.partnerId, name: client.partnerName });
            }
        });
        return Array.from(partnerMap.values());
    }, [clients]);

    const filteredClients = useMemo(() => {
        if (!selectedPartnerId) return [];
        return clients.filter(client => client.partnerId === selectedPartnerId);
    }, [clients, selectedPartnerId]);

    const handlePartnerChange = (partnerId: string) => {
        setSelectedPartnerId(partnerId);
        setSelectedClientId(''); 
        setTransactionAmount('');
    }

    const handleClientChange = (clientId: string) => {
        setSelectedClientId(clientId);
        setTransactionAmount('');
        setComboboxOpen(false);
    }
    
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        formDataRef.current = data;

        if (overage > 0 && overage <= 300) {
            setConfirmDebtDialogOpen(true);
        } else {
            startTransition(() => {
                dispatch(data);
            });
        }
    };

    const handleConfirmAndSubmit = () => {
        if (formDataRef.current) {
            formDataRef.current.set('allowOverage', 'true');
            const data = formDataRef.current;
            startTransition(() => {
                dispatch(data);
            });
            setConfirmDebtDialogOpen(false);
        }
    }


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Record Transaction</h1>
                <p className="text-muted-foreground">Select a client and record their meal transaction.</p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>New Transaction Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {initialClients.length > 0 ? (
                            <form onSubmit={handleFormSubmit} ref={formRef} className="space-y-4">
                                {state?.errors?._form && (
                                    <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{state.errors._form[0]}</AlertDescription></Alert>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="receiptNo">Receipt No.</Label>
                                    <Input id="receiptNo" name="receiptNo" required />
                                    {state?.errors?.receiptNo && <p className="text-sm text-destructive">{state.errors.receiptNo[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="partner">Company</Label>
                                    <Select name="partner" required onValueChange={handlePartnerChange} value={selectedPartnerId}>
                                        <SelectTrigger id="partner"><SelectValue placeholder="Select a company" /></SelectTrigger>
                                        <SelectContent>
                                            {partners.map(partner => <SelectItem key={partner.id} value={partner.id}>{partner.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Client</Label>
                                    <Input type="hidden" name="client" value={selectedClientId} />
                                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className="w-full justify-between" disabled={!selectedPartnerId}>
                                                {selectedClientId ? filteredClients.find((client) => client.id === selectedClientId)?.name : "Select a client..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search client..." />
                                                <CommandList>
                                                    <CommandEmpty>No client found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {filteredClients.map((client) => (
                                                            <CommandItem key={client.id} value={client.name} onSelect={() => handleClientChange(client.id)}>
                                                                <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex justify-between w-full">
                                                                    <span>{client.name}</span>
                                                                    <span className="font-mono text-xs text-muted-foreground">{formatCurrency(client.periodAllowance - client.utilizedAmount)}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {state?.errors?.client && <p className="text-sm text-destructive">{state.errors.client[0]}</p>}
                                </div>
                                
                                {selectedClient && (
                                     <div className="text-xs text-muted-foreground space-y-1 rounded-md bg-muted p-3">
                                        <p><strong>Available Balance:</strong> {formatCurrency(availableBalance)}</p>
                                        <p className={cn(hasDebt && "text-destructive font-bold")}><strong>Current Debt:</strong> {formatCurrency(selectedClient.debt)}</p>
                                    </div>
                                )}
                                
                                {hasDebt && (
                                    <Alert variant="destructive">
                                        <ShieldBan className="h-4 w-4" />
                                        <AlertTitle>Transactions Blocked</AlertTitle>
                                        <AlertDescription>This client has an outstanding debt.</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount (KES)</Label>
                                    <Input id="amount" name="amount" type="number" placeholder="0.00" step="0.01" required min="0" 
                                        value={transactionAmount}
                                        onChange={(e) => setTransactionAmount(e.target.value)}
                                        disabled={!selectedClientId || hasDebt}
                                    />
                                    {state?.errors?.amount && <p className="text-sm text-destructive">{state.errors.amount[0]}</p>}
                                </div>
                                
                                {overage > 0 && overage <= 300 && (
                                    <Alert variant="default" className="border-amber-500 text-amber-700 [&>svg]:text-amber-500">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Debt Warning</AlertTitle>
                                        <AlertDescription>
                                            This transaction will create a new debt of <span className="font-bold">{formatCurrency(overage)}</span>.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                {overage > 300 && (
                                    <Alert variant="destructive">
                                        <ShieldBan className="h-4 w-4" />
                                        <AlertTitle>Debt Limit Exceeded</AlertTitle>
                                        <AlertDescription>
                                            The maximum allowed debt is {formatCurrency(300)}.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                
                                <div className="pt-2">
                                    <SubmitButton disabled={isButtonDisabled} pending={isPending}>
                                      {overage > 0 && overage <= 300 ? 'Allow Transaction' : <><PlusCircle className="mr-2 h-4 w-4" />Record Transaction</>}
                                    </SubmitButton>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground py-8">
                                <p>No active partners or clients found.</p>
                                <p className="text-xs">An admin must start a new period for a partner before transactions can be recorded.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>A list of the most recent transactions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <DataTable columns={memberColumns} data={transactions} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={confirmDebtDialogOpen} onOpenChange={setConfirmDebtDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirm New Debt</AlertDialogTitle>
                    <AlertDialogDescription>
                        This transaction exceeds the client's available balance and will create a new debt of <span className="font-bold">{formatCurrency(overage)}</span>. Are you sure you want to proceed?
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmAndSubmit}>Confirm & Proceed</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
