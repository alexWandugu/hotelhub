import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center py-4">
          <Skeleton className="h-10 w-full max-w-sm" />
        </div>
        <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead>
                        <tr className="border-b transition-colors">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-32" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-40" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-32" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-48" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-24" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-24" /></th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-16" /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(5)].map((_, i) => (
                            <tr key={i} className="border-b transition-colors">
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-full" /></td>
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-full" /></td>
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-full" /></td>
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-full" /></td>
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-full" /></td>
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-full" /></td>
                                <td className="p-4 align-middle"><Skeleton className="h-5 w-10" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
