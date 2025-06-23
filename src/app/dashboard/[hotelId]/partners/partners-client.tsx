'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addPartner, updatePartner, deletePartner, startNewPeriod } from '@/lib/actions';
import type { Partner, Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, PlusCircle, MoreHorizontal, Pencil, Trash2, AlertTriangle, Loader2, HandCoins } from 'lucide-react';


type SerializablePartner = Omit<Partner, 'createdAt'> & {
    createdAt: string;
};
type SerializableClient = Omit<Client, 'createdAt' | 'periodAllowance'> & {
    createdAt: string;
    periodAllowance: number;
    utilizedAmount: number;
    debt: number;
};

interface PartnersClientProps {
    initialPartners: SerializablePartner[];
    initialClients: SerializableClient[];
    hotelId: string;
}

function AddSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Partner'}
        </Button>
    );
}

function EditSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
        </Button>
    );
}


export function PartnersClient({ initialPartners, initialClients, hotelId }: PartnersClientProps) {
    const { toast } = useToast();
    
    // State for dialogs
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [newPeriodAlertOpen, setNewPeriodAlertOpen] = useState(false);
    
    const [selectedPartner, setSelectedPartner] = useState<SerializablePartner | null>(null);

    // Form Refs
    const addFormRef = useRef<HTMLFormElement>(null);
    const editFormRef = useRef<HTMLFormElement>(null);

    // Add Partner Action State
    const addPartnerWithHotelId = addPartner.bind(null, hotelId);
    const [addState, addDispatch] = useActionState(addPartnerWithHotelId, { errors: null, message: null });
    
    // Update Partner Action State
    const updatePartnerAction = (prevState: any, formData: FormData) => {
        if (!selectedPartner) return { errors: null, message: 'Error: No partner selected for update.'};
        return updatePartner(hotelId, selectedPartner.id, prevState, formData);
    };
    const [editState, editDispatch] = useActionState(updatePartnerAction, { errors: null, message: null });

    // Handle Add Form submission feedback
    useEffect(() => {
        if (!addState.message) return;
        if (addState.errors) {
            toast({ variant: 'destructive', title: 'Error Adding Partner', description: addState.message });
        } else {
            toast({ title: 'Success!', description: addState.message });
            addFormRef.current?.reset();
            setAddDialogOpen(false);
        }
    }, [addState, toast]);

    // Handle Edit Form submission feedback
    useEffect(() => {
        if (!editState.message) return;
        if (editState.errors) {
            // Error is displayed inside the dialog, so no toast needed unless it's a generic one
        } else {
            toast({ title: 'Success!', description: editState.message });
            editFormRef.current?.reset();
            setEditDialogOpen(false);
        }
    }, [editState, toast]);

    const handleDeletePartner = async () => {
        if (!selectedPartner) return;
        try {
            await deletePartner(hotelId, selectedPartner.id);
            toast({ title: 'Partner Deleted', description: `${selectedPartner.name} and all their clients have been removed.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        }
        setDeleteAlertOpen(false);
    };

    const handleStartNewPeriod = async () => {
        if (!selectedPartner) return;
        try {
            await startNewPeriod(hotelId, selectedPartner.id);
            toast({ title: 'New Period Started', description: `Allowances for ${selectedPartner.name}'s clients have been updated.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
        }
        setNewPeriodAlertOpen(false);
    }
    
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return format(new Date(dateString), 'PPP');
    };

    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number') return 'N/A';
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    };

    const getConsumedAmount = (partnerId: string) => {
        const consumed = initialClients
            .filter(c => c.partnerId === partnerId)
            .reduce((sum, c) => sum + (c.utilizedAmount || 0), 0);
        return consumed;
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Your Partners</CardTitle>
                        <CardDescription>A list of all your partner companies.</CardDescription>
                    </div>
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" /> New Partner
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New Partner</DialogTitle>
                                <DialogDescription>Enter the details of the new partner company.</DialogDescription>
                            </DialogHeader>
                            <form action={addDispatch} ref={addFormRef} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="add-name">Name</Label>
                                    <Input id="add-name" name="name" required />
                                    {addState?.errors?.name && <p className="text-sm text-destructive">{addState.errors.name[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="add-employees">Sponsored Employees</Label>
                                    <Input id="add-employees" name="sponsoredEmployeesCount" type="number" placeholder="0" required min="1" />
                                    {addState?.errors?.sponsoredEmployeesCount && <p className="text-sm text-destructive">{addState.errors.sponsoredEmployeesCount[0]}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="add-amount">Total Shared Amount (KES)</Label>
                                    <Input id="add-amount" name="totalSharedAmount" type="number" placeholder="0.00" step="0.01" required min="0" />
                                    {addState?.errors?.totalSharedAmount && <p className="text-sm text-destructive">{addState.errors.totalSharedAmount[0]}</p>}
                                </div>
                                <DialogFooter className="pt-4">
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <AddSubmitButton />
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
                                        <TableHead className="text-right">Shared Amount</TableHead>
                                        <TableHead className="text-right">Consumed This Period</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialPartners.map((partner) => (
                                        <TableRow key={partner.id}>
                                            <TableCell className="font-medium">{partner.name}</TableCell>
                                            <TableCell><Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>{partner.status}</Badge></TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(partner.totalSharedAmount)}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(getConsumedAmount(partner.id))}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => { setSelectedPartner(partner); setNewPeriodAlertOpen(true) }}>
                                                            <HandCoins className="mr-2 h-4 w-4" /><span>Start New Period</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => { setSelectedPartner(partner); setEditDialogOpen(true); }}>
                                                            <Pencil className="mr-2 h-4 w-4" /><span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => { setSelectedPartner(partner); setDeleteAlertOpen(true); }} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /><span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
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

            {/* Edit Partner Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Partner</DialogTitle>
                        <DialogDescription>Update the details for {selectedPartner?.name}.</DialogDescription>
                    </DialogHeader>
                    <form action={editDispatch} ref={editFormRef} className="space-y-4 pt-4">
                        {editState?.errors?._form && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Update Error</AlertTitle>
                                <AlertDescription>{editState.errors._form[0]}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input id="edit-name" name="name" defaultValue={selectedPartner?.name} required />
                            {editState?.errors?.name && <p className="text-sm text-destructive">{editState.errors.name[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-employees">Sponsored Employees</Label>
                            <Input id="edit-employees" name="sponsoredEmployeesCount" type="number" defaultValue={selectedPartner?.sponsoredEmployeesCount} required min="1" />
                            {editState?.errors?.sponsoredEmployeesCount && <p className="text-sm text-destructive">{editState.errors.sponsoredEmployeesCount[0]}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-amount">Total Shared Amount (KES)</Label>
                            <Input id="edit-amount" name="totalSharedAmount" type="number" defaultValue={selectedPartner?.totalSharedAmount} step="0.01" required min="0" />
                            {editState?.errors?.totalSharedAmount && <p className="text-sm text-destructive">{editState.errors.totalSharedAmount[0]}</p>}
                        </div>
                        <DialogFooter className="pt-4">
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <EditSubmitButton />
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Partner Alert Dialog */}
            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the partner <span className="font-bold">{selectedPartner?.name}</span> and all of their associated clients and transactions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePartner} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* New Period Alert Dialog */}
            <AlertDialog open={newPeriodAlertOpen} onOpenChange={setNewPeriodAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Start a New Billing Period?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reset the utilized amounts and debts for all clients of <span className="font-bold">{selectedPartner?.name}</span> and issue the new period's allowance. Any outstanding debt from the previous period will be deducted from the new allowance. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStartNewPeriod}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
