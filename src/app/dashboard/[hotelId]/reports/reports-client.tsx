'use client';

import { useState, useMemo, useTransition } from 'react';
import { getPartnerPeriodHistory } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { PeriodHistory } from '@/lib/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
import { Download, Users, CalendarClock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type SerializablePeriodHistory = Omit<PeriodHistory, 'startDate' | 'endDate'> & {
    startDate: string;
    endDate: string;
};

interface ReportClientProps {
    hotelId: string;
    hotelName: string;
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

export function ReportsClient({ hotelId, hotelName, partners, initialIndebtedClients }: ReportClientProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isDownloading, setIsDownloading] = useState(false);
    
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

    const handleDownloadPdf = async (report: 'debt' | 'periods') => {
        const printAreaId = report === 'debt' ? 'print-area-debt' : 'print-area-periods';
        const partnerName = report === 'debt' ? selectedDebtPartner?.name : selectedHistoryPartner?.name;
        const reportTitle = report === 'debt' ? 'Client-Debt-Report' : 'Billing-Period-History';

        const input = document.getElementById(printAreaId);

        if (!input || !partnerName) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Please select a partner to generate a report.',
            });
            return;
        }

        setIsDownloading(true);
        toast({
            title: 'Generating PDF...',
            description: 'Your report is being prepared for download.',
        });

        try {
            const canvas = await html2canvas(input, { 
                scale: 2, 
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // ---- HEADER ----
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(24);
            pdf.setTextColor(40, 58, 90); // Dark blue color
            pdf.text(hotelName, pdfWidth / 2, 60, { align: 'center' });
            pdf.setDrawColor(221, 221, 221); // Light gray line
            pdf.line(40, 80, pdfWidth - 40, 80);

            // ---- PDF CONTENT ----
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;

            const contentWidth = pdfWidth - 80; // 40pt margin each side
            const contentHeight = pdfHeight - 160; // 100pt top, 60pt bottom

            let imgWidth = contentWidth;
            let imgHeight = imgWidth / ratio;
            
            if (imgHeight > contentHeight) {
                imgHeight = contentHeight;
                imgWidth = imgHeight * ratio;
            }

            const x = (pdfWidth - imgWidth) / 2;
            const y = 100;
            
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

            // ---- FOOTER ----
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text("Generated by Hotel Hub", pdfWidth / 2, pdfHeight - 30, { align: 'center' });
            
            const fileName = `${partnerName.replace(/\s+/g, '-')}-${reportTitle}-${new Date().toISOString().split('T')[0]}.pdf`;
            
            pdf.save(fileName);

        } catch (error) {
            console.error("Error generating PDF: ", error);
            toast({
                variant: 'destructive',
                title: 'PDF Generation Failed',
                description: 'An error occurred while creating the PDF.',
            });
        } finally {
            setIsDownloading(false);
        }
    };


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Debt Report Generator</CardTitle>
                    <CardDescription>Select a partner company to view and download a report of clients with outstanding debt.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
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
                        <Button onClick={() => handleDownloadPdf('debt')} disabled={isDownloading || !selectedDebtPartnerId || filteredIndebtedClients.length === 0} className="w-full sm:w-auto">
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Download PDF
                        </Button>
                    </div>

                     {selectedDebtPartnerId && (
                        <div className="border rounded-lg mt-4">
                            <div id="print-area-debt" className="p-6">
                                <div className="flex justify-between items-center border-b pb-4 mb-4">
                                    <div>
                                        <h3 className="font-headline text-2xl font-bold text-primary">{selectedDebtPartner?.name}</h3>
                                        <p className="text-lg font-semibold">Client Debt Report</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Generated On</p>
                                        <p className="font-medium">{new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {filteredIndebtedClients.length > 0 ? (
                                    <>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="font-bold">Client Name</TableHead>
                                                    <TableHead className="text-right font-bold">Debt Amount</TableHead>
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
                                    <div className="flex justify-end pt-4 mt-4 border-t">
                                        <div className="text-right">
                                            <p className="font-semibold text-lg">Total Debt:</p>
                                            <p className="text-2xl font-bold font-mono text-destructive">{formatCurrency(totalDebt)}</p>
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
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Period History Report</CardTitle>
                    <CardDescription>Select a partner company to download their complete billing period history.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex flex-col sm:flex-row gap-4">
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
                        <Button onClick={() => handleDownloadPdf('periods')} disabled={isDownloading || !selectedHistoryPartnerId || periodHistory.length === 0} className="w-full sm:w-auto">
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Download PDF
                        </Button>
                    </div>

                    {selectedHistoryPartnerId && (
                        <div className="border rounded-lg mt-4">
                            <div id="print-area-periods" className="p-6">
                               <div className="flex justify-between items-center border-b pb-4 mb-4">
                                    <div>
                                        <h3 className="font-headline text-2xl font-bold text-primary">{selectedHistoryPartner?.name}</h3>
                                        <p className="text-lg font-semibold">Billing Period History</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Generated On</p>
                                        <p className="font-medium">{new Date().toLocaleDateString()}</p>
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
                                                    <TableHead className="font-bold">Start Date</TableHead>
                                                    <TableHead className="font-bold">End Date</TableHead>
                                                    <TableHead className="text-center font-bold">Employees</TableHead>
                                                    <TableHead className="text-right font-bold">Sponsorship Amount</TableHead>
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
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
