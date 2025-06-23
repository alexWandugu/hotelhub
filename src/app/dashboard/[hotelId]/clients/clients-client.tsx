'use client';

import { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addClient, updateClient, deleteClient } from '@/lib/actions';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { Users, PlusCircle, AlertTriangle, Loader2, Building2, PieChart, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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

function AddClientSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Client'}
        </Button>
    );
}

function EditClientSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
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
    const { toast } = useToast();
    const addFormRef = useRef<HTMLFormElement>(null);
    const editFormRef = useRef<HTMLFormElement>(null);

    // State for dialogs
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<SerializableClient | null>(null);

    // Add Client Action
    const addClientWithHotelId = addClient.bind(null, hotelId);
    const [addState, addDispatch] = useActionState(addClientWithHotelId, { errors: null, message: null });

    // Update Client Action
     const updateClientAction = (prevState: any, formData: FormData) => {
        if (!selectedClient) return { errors: null, message: 'Error: No client selected for update.'};
        return updateClient(hotelId, selectedClient.id, prevState, formData);
    };
    const [editState, editDispatch] = useActionState(updateClientAction, { errors: null, message: null });

    // Effect for Add Client
    useEffect(() => {
        if (addState.message) {
            if (addState.errors) {
                // Errors shown inline in the dialog
            } else {
                toast({
                    title: 'Success!',
                    description: addState.message,
                });
                setAddDialogOpen(false);
                addFormRef.current?.reset();
            }
        }
    }, [addState, toast]);
    
    // Effect for Edit Client
    useEffect(() => {
        if (editState.message) {
            if (editState.errors) {
                // Errors shown inline in the dialog
            } else {
                toast({
                    title: 'Success!',
                    description: editState.message,
                });
                setEditDialogOpen(false);
                editFormRef.current?.reset();
            }
        }
    }, [editState, toast]);

    const handleDeleteClient = async () => {
        if (!selectedClient) return;
        try {
            await deleteClient(hotelId, selectedClient.id);
            toast({ title: 'Client Deleted', description: `${selectedClient.name} has been removed.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        }
        setDeleteAlertOpen(false);
    };
    
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
    <>
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
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
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
                                <form action={addDispatch} ref={addFormRef} className="space-y-4 pt-4">
                                    {addState?.errors?._form && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Validation Error</AlertTitle>
                                            <AlertDescription>
                                                {addState.errors._form[0]}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Client Name</Label>
                                        <Input id="name" name="name" required />
                                        {addState?.errors?.name && <p className="text-sm text-destructive">{addState.errors.name[0]}</p>}
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
                                        {addState?.errors?.partner && <p className="text-sm text-destructive">{addState.errors.partner[0]}</p>}
                                    </div>
                                    <p className="text-xs text-muted-foreground pt-2">
                                    The meal allowance will be automatically calculated based on the partner's agreement.
                                    </p>
                                    <DialogFooter className="pt-4">
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <AddClientSubmitButton />
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
                                                <div className="relative w-full overflow-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Client Name</TableHead>
                                                            <TableHead>Available Balance</TableHead>
                                                            <TableHead className="text-right">Debt</TableHead>
                                                            <TableHead>Date Added</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {partner.clients.map((client) => (
                                                            <TableRow key={client.id}>
                                                                <TableCell className="font-medium">{client.name}</TableCell>
                                                                <TableCell className="font-mono">{formatCurrency(client.periodAllowance - client.utilizedAmount)}</TableCell>
                                                                <TableCell className="text-right font-mono text-destructive">{formatCurrency(client.debt)}</TableCell>
                                                                <TableCell>{formatDate(client.createdAt)}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                                <span className="sr-only">Open menu</span>
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                            <DropdownMenuItem onSelect={() => { setSelectedClient(client); setEditDialogOpen(true); }}>
                                                                                <Pencil className="mr-2 h-4 w-4" /><span>Edit</span>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem onSelect={() => { setSelectedClient(client); setDeleteAlertOpen(true); }} className="text-destructive focus:text-destructive">
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

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Client</DialogTitle>
                    <DialogDescription>Update the name for {selectedClient?.name}.</DialogDescription>
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
                        <Label htmlFor="edit-client-name">Client Name</Label>
                        <Input id="edit-client-name" name="name" defaultValue={selectedClient?.name} required />
                        {editState?.errors?.name && <p className="text-sm text-destructive">{editState.errors.name[0]}</p>}
                    </div>
                    <DialogFooter className="pt-4">
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <EditClientSubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the client <span className="font-bold">{selectedClient?.name}</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
    );
}
