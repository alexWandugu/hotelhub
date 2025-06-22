import { transactions, Transaction } from "@/lib/data";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

async function getData(): Promise<Transaction[]> {
  // Fetch data from your API here.
  return transactions;
}

export default async function TransactionsPage() {
  const data = await getData();

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between space-y-2">
          <div>
            <h1 className="text-3xl font-bold font-headline">Transactions</h1>
            <p className="text-muted-foreground">
              View and manage all client transactions.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </div>
        </div>
      
      <DataTable columns={columns} data={data} />
    </div>
  );
}
