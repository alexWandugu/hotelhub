import { Skeleton } from "@/components/ui/skeleton";

export default function PartnersLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <div className="rounded-md border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
            <div>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
            </div>
            <Skeleton className="h-10 w-full sm:w-40" />
        </div>
        <div className="p-6 pt-0">
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                    <thead>
                        <tr className="border-b transition-colors">
                            {[...Array(7)].map((_, i) => (
                                <th key={i} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"><Skeleton className="h-4 w-24" /></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(3)].map((_, i) => (
                            <tr key={i} className="border-b transition-colors">
                                {[...Array(7)].map((_, j) => (
                                <td key={j} className="p-4 align-middle"><Skeleton className="h-5 w-full" /></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        </div>
      </div>
    </div>
  );
}
