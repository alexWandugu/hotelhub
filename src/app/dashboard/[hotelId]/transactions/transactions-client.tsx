
'use client';

import { useState, useEffect, useRef, useActionState, useMemo, useTransition } from 'react';
import { addTransaction } from '@/lib/actions';
import type { Transaction } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from './data-table';
import { columns } from './columns';
import { cn } from '@/lib/utils';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// UI Imports
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
interface TransactionsClientProps {
    initialTransactions: SerializableTransaction[];
    clients: ClientForDropdown[];
    hotelId: string;
}

// Submit Button Component
function SubmitButton({ disabled, pending, children }: { disabled: boolean, pending: boolean, children: React.ReactNode }) {
    return (
        <Button type="submit" disabled={pending || disabled}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</> : children}
        </Button>
    );
}

// Main Component
export function TransactionsClient({ initialTransactions, clients: serverClients, hotelId }: TransactionsClientProps) {
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmDebtDialogOpen, setConfirmDebtDialogOpen] = useState(false);
    const formDataRef = useRef<FormData | null>(null);

    // Live data state
    const [transactions, setTransactions] = useState<SerializableTransaction[]>(initialTransactions);
    const [allClients, setAllClients] = useState<ClientForDropdown[]>(serverClients);

    // Form state management
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [transactionAmount, setTransactionAmount] = useState('');
    
    // Server action state
    const [isPending, startTransition] = useTransition();
    const addTransactionWithHotelId = addTransaction.bind(null, hotelId);
    const [state, dispatch] = useActionState(addTransactionWithHotelId, { errors: null, message: null });

    // Add listeners for real-time data
    useEffect(() => {
        const transactionsQuery = query(collection(db, `hotels/${hotelId}/transactions`), orderBy('createdAt', 'desc'));
        const transUnsub = onSnapshot(transactionsQuery, (snapshot) => {
            const fetchedTransactions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    createdAt: (data.createdAt.toDate()).toISOString()
                } as SerializableTransaction;
            });
            setTransactions(fetchedTransactions);
        });

        const activePartnerIds = Array.from(new Set(serverClients.map(c => c.partnerId)));
        if (activePartnerIds.length === 0) {
            setAllClients([]);
            return () => { transUnsub(); };
        }

        const clientsQuery = query(collection(db, `hotels/${hotelId}/clients`), where('partnerId', 'in', activePartnerIds));
        const clientsUnsub = onSnapshot(clientsQuery, (snapshot) => {
            const fetchedClients = snapshot.docs.map(doc => {
                const c = doc.data();
                return {
                    id: doc.id,
                    name: c.name,
                    partnerName: c.partnerName,
                    partnerId: c.partnerId,
                    periodAllowance: Number(c.periodAllowance || 0),
                    utilizedAmount: Number(c.utilizedAmount || 0),
                    debt: Number(c.debt || 0),
                };
            });
            setAllClients(fetchedClients);
        });

        return () => {
            transUnsub();
            clientsUnsub();
        };

    }, [hotelId, serverClients]);

    const resetFormState = () => {
        setDialogOpen(false);
        formRef.current?.reset();
        setSelectedPartnerId('');
        setSelectedClientId('');
        setTransactionAmount('');
        formDataRef.current = null;
    }

    // Reset local state on successful submission
    useEffect(() => {
        if (state.message) {
            if (state.errors) {
                // Errors are shown inline
            } else {
                toast({ title: 'Success!', description: state.message });
                resetFormState();
            }
        }
    }, [state, toast]);
    
    // Currency formatter
    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number' || isNaN(amount)) return 'N/A';
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    // Derived data for UI logic
    const selectedClient = useMemo(() => allClients.find(c => c.id === selectedClientId), [allClients, selectedClientId]);
    
    const hasDebt = useMemo(() => {
        if (!selectedClient) return false;
        return Number(selectedClient.debt || 0) > 0;
    }, [selectedClient]);

    const availableBalance = useMemo(() => {
        if (!selectedClient) return 0;
        const allowance = Number(selectedClient.periodAllowance || 0);
        const utilized = Number(selectedClient.utilizedAmount || 0);
        return allowance - utilized;
    }, [selectedClient]);

    const overage = useMemo(() => {
        const amount = parseFloat(transactionAmount);
        if (isNaN(amount) || !selectedClient || amount <= 0) return 0;
        return amount - availableBalance;
    }, [transactionAmount, availableBalance, selectedClient]);

    const isButtonDisabled = !selectedClientId || (parseFloat(transactionAmount) || 0) <= 0 || hasDebt || overage > 300;
    
    const partners = useMemo(() => {
        const partnerMap = new Map<string, { id: string; name: string }>();
        allClients.forEach(client => {
            if (!partnerMap.has(client.partnerId)) {
                partnerMap.set(client.partnerId, { id: client.partnerId, name: client.partnerName });
            }
        });
        return Array.from(partnerMap.values());
    }, [allClients]);

    const filteredClients = useMemo(() => {
        if (!selectedPartnerId) return [];
        return allClients.filter(client => client.partnerId === selectedPartnerId);
    }, [allClients, selectedPartnerId]);

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
    
    const isAmountDisabled = !selectedClientId || hasDebt;

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
        <>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Transactions</h1>
                    <p className="text-muted-foreground">
                    View and manage all client transactions.
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
                    setDialogOpen(isOpen);
                    if (!isOpen) {
                        resetFormState();
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto" disabled={allClients.length === 0}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Transaction
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Record New Transaction</DialogTitle>
                            <DialogDescription>
                                {allClients.length > 0 ? "Select a client and enter the transaction amount." : "You must add a client before you can record a transaction."}
                            </DialogDescription>
                        </DialogHeader>
                        {allClients.length > 0 && (
                            <form onSubmit={handleFormSubmit} ref={formRef} className="space-y-4 pt-4">
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
                                                            <CommandItem
                                                                key={client.id}
                                                                value={client.name}
                                                                onSelect={() => handleClientChange(client.id)}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex justify-between w-full">
                                                                    <span>{client.name}</span>
                                                                    <span className="font-mono text-xs text-muted-foreground">{formatCurrency(Number(client.periodAllowance || 0) - Number(client.utilizedAmount || 0))}</span>
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
                                     <div className="text-xs text-muted-foreground space-y-1 rounded-md bg-muted p-2">
                                        <p><strong>Available Balance:</strong> {formatCurrency(availableBalance)}</p>
                                        <p className={cn(hasDebt && "text-destructive font-bold")}><strong>Current Debt:</strong> {formatCurrency(Number(selectedClient.debt || 0))}</p>
                                    </div>
                                )}
                                
                                {hasDebt && (
                                    <Alert variant="destructive">
                                        <ShieldBan className="h-4 w-4" />
                                        <AlertTitle>Transactions Blocked</AlertTitle>
                                        <AlertDescription>This client has an outstanding debt and cannot make new transactions.</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="amount">Amount (KES)</Label>
                                    <Input id="amount" name="amount" type="number" placeholder="0.00" step="0.01" required min="0" 
                                        value={transactionAmount}
                                        onChange={(e) => setTransactionAmount(e.target.value)}
                                        disabled={isAmountDisabled}
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


                                <DialogFooter className="pt-4">
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <SubmitButton disabled={isButtonDisabled} pending={isPending}>
                                        {overage > 0 && overage <= 300 ? 'Allow Transaction' : 'Record Transaction'}
                                    </SubmitButton>
                                </DialogFooter>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            <DataTable columns={columns} data={transactions} />

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
        </>
    );
}
