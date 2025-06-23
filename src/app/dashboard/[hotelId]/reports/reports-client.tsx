'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ReportClientProps {
    partners: { id: string; name: string }[];
    indebtedClients: {
        id: string;
        name: string;
        partnerId: string;
        partnerName: string;
        debt: number;
    }[];
}

export function ReportsClient({ partners, indebtedClients }: ReportClientProps) {
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
    const selectedPartner = partners.find(p => p.id === selectedPartnerId);

    const filteredClients = useMemo(() => {
        if (!selectedPartnerId) return [];
        return indebtedClients.filter(c => c.partnerId === selectedPartnerId);
    }, [indebtedClients, selectedPartnerId]);

    const totalDebt = useMemo(() => {
        return filteredClients.reduce((acc, client) => acc + client.debt, 0);
    }, [filteredClients]);

    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number') return 'N/A';
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);
    };

    const handlePrint = () => {
        window.print();
    }

    return (
        <>
            <Card data-reports-ui>
                <CardHeader>
                    <CardTitle>Debt Report Generator</CardTitle>
                    <CardDescription>Select a partner company to view and print a report of clients with outstanding debt.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select onValueChange={setSelectedPartnerId} value={selectedPartnerId}>
                            <SelectTrigger className="w-full sm:w-[300px]">
                                <SelectValue placeholder="Select a partner company" />
                            </SelectTrigger>
                            <SelectContent>
                                {partners.map(partner => (
                                    <SelectItem key={partner.id} value={partner.id}>
                                        {partner.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handlePrint} disabled={!selectedPartnerId || filteredClients.length === 0} className="w-full sm:w-auto">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {selectedPartnerId && (
                <div id="print-area">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="font-headline text-2xl">Debt Report: {selectedPartner?.name}</CardTitle>
                                    <CardDescription>Generated on: {new Date().toLocaleDateString()}</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Clients with Debt</p>
                                    <p className="text-2xl font-bold">{filteredClients.length}</p>
                                </div>
                             </div>
                        </CardHeader>
                        <CardContent>
                            {filteredClients.length > 0 ? (
                                <>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Client Name</TableHead>
                                                <TableHead className="text-right">Debt Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredClients.map(client => (
                                                <TableRow key={client.id}>
                                                    <TableCell className="font-medium">{client.name}</TableCell>
                                                    <TableCell className="text-right font-mono text-destructive">{formatCurrency(client.debt)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <div className="text-right">
                                        <p className="font-semibold">Total Debt:</p>
                                        <p className="text-xl font-bold font-mono text-destructive">{formatCurrency(totalDebt)}</p>
                                    </div>
                                </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 bg-secondary rounded-lg">
                                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="font-semibold">No Debt Found</p>
                                    <p className="text-sm text-muted-foreground">There are no clients with outstanding debt for this partner.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
