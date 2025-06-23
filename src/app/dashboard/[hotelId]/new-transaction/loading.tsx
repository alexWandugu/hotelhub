import { Skeleton } from "@/components/ui/skeleton";

export default function NewTransactionLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
        <div className="lg:col-span-1 space-y-4 rounded-lg border p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-40" />
        </div>
        <div className="lg:col-span-2 space-y-4 rounded-lg border p-6">
             <Skeleton className="h-8 w-56" />
             <Skeleton className="h-4 w-72" />
             <Skeleton className="mt-4 h-[300px] w-full" />
        </div>
      </div>
    </div>
  );
}
