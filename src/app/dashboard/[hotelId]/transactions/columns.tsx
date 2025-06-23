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
import { MoreHorizontal, ArrowUpDown, Trash2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { flagTransaction, deleteTransaction } from "@/lib/actions";
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

    const handleDelete = async () => {
        try {
            await deleteTransaction(params.hotelId, transaction.id);
            toast({ title: "Transaction Deleted", description: "The transaction and its associated debt have been removed." });
        } catch (error: any) => {
            toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
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
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export const columns: ColumnDef<Transaction & { createdAt: string }>[] = [
  {
    accessorKey: "receiptNo",
    header: "Receipt No."
  },
  {
    accessorKey: "clientName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Client Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "partnerName",
    header: "Partner",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => format(new Date(row.getValue("createdAt")), 'PPp')
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <div className="text-right">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Amount <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
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
