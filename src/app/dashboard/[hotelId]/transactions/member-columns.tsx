"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Transaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { flagTransaction } from "@/lib/actions";
import { useParams } from "next/navigation";
import { format } from 'date-fns';

const ActionCell = ({ row }: { row: any }) => {
    const { toast } = useToast();
    const params = useParams<{ hotelId: string }>();
    const transaction = row.original;

    const handleFlag = async () => {
        try {
            await flagTransaction(params.hotelId, transaction.id);
            toast({ title: "Transaction Flagged", description: "The transaction has been marked for review." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Action Failed", description: error.message });
        }
    };

    return (
        <div className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {transaction.status !== 'flagged' &&
                        <DropdownMenuItem onClick={handleFlag}>
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Flag for review
                        </DropdownMenuItem>
                    }
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export const memberColumns: ColumnDef<Transaction & { createdAt: string }>[] = [
  {
    accessorKey: "receiptNo",
    header: "Receipt No."
  },
  {
    accessorKey: "clientName",
    header: "Client Name",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), 'PP')
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant =
        status === "completed" ? "default"
        : status === "flagged" ? "destructive"
        : "secondary";
      return <Badge variant={variant} className="capitalize">{status}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ActionCell,
  },
];
