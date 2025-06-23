import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 w-full sm:w-[300px]" />
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>
      </div>
      
      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
         <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 w-full sm:w-[300px]" />
          <Skeleton className="h-10 w-full sm:w-52" />
        </div>
        <div className="rounded-md border">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
