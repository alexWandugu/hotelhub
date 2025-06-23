'use client';

import { useState, useEffect, useRef, useActionState, useMemo, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { addTransaction } from '@/lib/actions';
import type { Transaction, Client, Partner } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './transactions/data-table';
import { memberColumns } from './transactions/member-columns';
import { cn } from '@/lib/utils';
import { collection, getDocs, orderBy, query, onSnapshot, Unsubscribe, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// UI Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlusCircle, AlertTriangle, Loader2, ChevronsUpDown, Check, ShieldBan } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

// Submit Button Component
function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending || disabled}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Record Transaction
        </Button>
    );
}

export default function MemberDashboard({ hotelId }: { hotelId: string }) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState(true);
    
    // Data State
    const [transactions, setTransactions] = useState<SerializableTransaction[]>([]);
    const [clients, setClients] = useState<ClientForDropdown[]>([]);
    
    // Form state management
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [transactionAmount, setTransactionAmount] = useState('');
    
    // Server action state
    const addTransactionWithHotelId = addTransaction.bind(null, hotelId);
    const [state, dispatch] = useActionState(addTransactionWithHotelId, { errors: null, message: null });

    const resetFormState = useCallback(() => {
        formRef.current?.reset();
        setSelectedPartnerId('');
        setSelectedClientId('');
        setTransactionAmount('');
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
    
    // Data Fetching and Real-time Updates
    useEffect(() => {
        setLoading(true);
        let unsubscribes: Unsubscribe[] = [];

        const fetchAndSubscribe = async () => {
            try {
                // Partners with active periods
                const partnersQuery = query(collection(db, `hotels/${hotelId}/partners`), where('lastPeriodStartedAt', '!=', null));
                const partnersSnapshot = await getDocs(partnersQuery);
                const activePartners = partnersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner));
                const activePartnerIds = activePartners.map(p => p.id);

                if (activePartnerIds.length > 0) {
                     // Clients
                    const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), where('partnerId', 'in', activePartnerIds), orderBy('name', 'asc'));
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
                        setClients(fetchedClients);
                    });
                    unsubscribes.push(clientsUnsub);
                } else {
                    setClients([]);
                }

                // Transactions
                const transactionsQuery = query(collection(db, `hotels/${hotelId}/transactions`), orderBy('createdAt', 'desc'));
                const transactionsUnsub = onSnapshot(transactionsQuery, (snapshot) => {
                    const fetchedTransactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, createdAt: (doc.data().createdAt.toDate()).toISOString() })) as SerializableTransaction[];
                    setTransactions(fetchedTransactions);
                });
                unsubscribes.push(transactionsUnsub);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load dashboard data.' });
            } finally {
                setLoading(false);
            }
        };

        fetchAndSubscribe();
        return () => unsubscribes.forEach(unsub => unsub());
    }, [hotelId, toast]);

    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number' || isNaN(amount)) return 'N/A';
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    // Derived data for UI logic
    const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);
    const hasDebt = useMemo(() => (selectedClient?.debt ?? 0) > 0, [selectedClient]);
    const availableBalance = useMemo(() => (selectedClient?.periodAllowance ?? 0) - (selectedClient?.utilizedAmount ?? 0), [selectedClient]);
    const transactionExceedsBalance = useMemo(() => {
        const amount = parseFloat(transactionAmount);
        if (isNaN(amount) || !selectedClient || amount <= 0) return false;
        return amount > availableBalance;
    }, [transactionAmount, availableBalance, selectedClient]);

    const isButtonDisabled = !selectedClientId || (parseFloat(transactionAmount) || 0) <= 0 || hasDebt || transactionExceedsBalance;
    
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
                        {clients.length > 0 ? (
                            <form action={dispatch} ref={formRef} className="space-y-4">
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
                                
                                {transactionExceedsBalance && (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Amount Exceeds Balance</AlertTitle>
                                        <AlertDescription>The transaction amount cannot be greater than the available balance.</AlertDescription>
                                    </Alert>
                                )}
                                
                                <div className="pt-2">
                                    <SubmitButton disabled={isButtonDisabled} />
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
                            {loading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : (
                               <DataTable columns={memberColumns} data={transactions} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
