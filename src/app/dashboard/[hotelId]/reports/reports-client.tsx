'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { getPartnerPeriodHistory } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { PeriodHistory } from '@/lib/types';

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
import { Badge } from '@/components/ui/badge';
import { Printer, Users, CalendarClock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type SerializablePeriodHistory = Omit<PeriodHistory, 'startDate' | 'endDate'> & {
    startDate: string;
    endDate: string;
};

interface ReportClientProps {
    hotelId: string;
    partners: {
        id: string;
        name: string;
    }[];
    initialIndebtedClients: {
        id: string;
        name: string;
        partnerId: string;
        partnerName: string;
        debt: number;
    }[];
}

export function ReportsClient({ hotelId, partners, initialIndebtedClients }: ReportClientProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    // Debt Report State
    const [selectedDebtPartnerId, setSelectedDebtPartnerId] = useState<string>('');
    
    // Period History Report State
    const [selectedHistoryPartnerId, setSelectedHistoryPartnerId] = useState<string>('');
    const [periodHistory, setPeriodHistory] = useState<SerializablePeriodHistory[]>([]);

    const selectedDebtPartner = partners.find(p => p.id === selectedDebtPartnerId);
    const selectedHistoryPartner = partners.find(p => p.id === selectedHistoryPartnerId);
    
    const filteredIndebtedClients = useMemo(() => {
        if (!selectedDebtPartnerId) return [];
        return initialIndebtedClients.filter(c => c.partnerId === selectedDebtPartnerId);
    }, [initialIndebtedClients, selectedDebtPartnerId]);

    const totalDebt = useMemo(() => {
        return filteredIndebtedClients.reduce((acc, client) => acc + client.debt, 0);
    }, [filteredIndebtedClients]);
    
    useEffect(() => {
        const handleAfterPrint = () => {
            document.body.removeAttribute('data-printing');
        };

        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    const handleHistoryPartnerChange = (partnerId: string) => {
        setSelectedHistoryPartnerId(partnerId);
        setPeriodHistory([]);
        if (partnerId) {
            startTransition(async () => {
                try {
                    const history = await getPartnerPeriodHistory(hotelId, partnerId);
                    setPeriodHistory(history);
                } catch (error: any) {
                    toast({
                        variant: 'destructive',
                        title: 'Error fetching history',
                        description: error.message
                    });
                }
            });
        }
    };

    const formatCurrency = (amount: number) => {
        if (typeof amount !== 'number') return 'N/A';
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);
    };
    
    const formatDate = (dateString: string) => format(new Date(dateString), 'PP');

    const handlePrint = (report: 'debt' | 'periods') => {
        document.body.setAttribute('data-printing', report);
        // Use a short timeout to allow the DOM to update before triggering the print dialog
        setTimeout(() => {
            window.print();
        }, 100);
    };

    return (
        <div className="space-y-8">
            <Card data-reports-ui id="print-area-debt-card">
                <CardHeader className="print-hide">
                    <CardTitle>Debt Report Generator</CardTitle>
                    <CardDescription>Select a partner company to view and print a report of clients with outstanding debt.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 print-hide">
                        <Select onValueChange={setSelectedDebtPartnerId} value={selectedDebtPartnerId}>
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
                        <Button onClick={() => handlePrint('debt')} disabled={!selectedDebtPartnerId || filteredIndebtedClients.length === 0} className="w-full sm:w-auto">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Debt Report
                        </Button>
                    </div>

                     {selectedDebtPartnerId && (
                        <div id="print-area-debt" className="pt-4">
                             <div className="flex justify-between items-start border-b pb-4 mb-4">
                                <div>
                                    <h3 className="font-headline text-xl">Debt Report: {selectedDebtPartner?.name}</h3>
                                    <p className="text-sm text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Clients with Debt</p>
                                    <p className="text-2xl font-bold">{filteredIndebtedClients.length}</p>
                                </div>
                             </div>
                            {filteredIndebtedClients.length > 0 ? (
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
                                            {filteredIndebtedClients.map(client => (
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
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card data-reports-ui id="print-area-periods-card">
                <CardHeader className="print-hide">
                    <CardTitle>Period History Report</CardTitle>
                    <CardDescription>Select a partner company to view their complete billing period history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-4 print-hide">
                        <Select onValueChange={handleHistoryPartnerChange} value={selectedHistoryPartnerId}>
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
                        <Button onClick={() => handlePrint('periods')} disabled={!selectedHistoryPartnerId || periodHistory.length === 0} className="w-full sm:w-auto">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Period History
                        </Button>
                    </div>

                    <div id="print-area-periods" className="pt-4">
                        {selectedHistoryPartnerId && (
                           <>
                           <div className="flex justify-between items-start border-b pb-4 mb-4">
                                <div>
                                    <h3 className="font-headline text-xl">Period History: {selectedHistoryPartner?.name}</h3>
                                    <p className="text-sm text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                           
                           {isPending ? (
                               <div className="flex items-center justify-center p-8">
                                   <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                               </div>
                           ) : periodHistory.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Start Date</TableHead>
                                                <TableHead>End Date</TableHead>
                                                <TableHead className="text-center">Employees</TableHead>
                                                <TableHead className="text-right">Sponsorship Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {periodHistory.map((period) => (
                                                <TableRow key={period.id}>
                                                    <TableCell>{formatDate(period.startDate)}</TableCell>
                                                    <TableCell>{formatDate(period.endDate)}</TableCell>
                                                    <TableCell className="text-center">{period.sponsoredEmployeesCount}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(period.totalSharedAmount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 bg-secondary rounded-lg">
                                    <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="font-semibold">No Period History Found</p>
                                    <p className="text-sm text-muted-foreground">This partner does not have any recorded billing periods yet.</p>
                                </div>
                           )}
                           </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
