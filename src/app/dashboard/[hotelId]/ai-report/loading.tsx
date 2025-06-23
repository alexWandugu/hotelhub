import { Skeleton } from "@/components/ui/skeleton";

export default function AiReportLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-full max-w-lg mt-2" />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border p-6">
            <div className="space-y-1.5">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-80 w-full" />
            <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-10 w-44" />
            </div>
        </div>
         <div className="space-y-4 rounded-lg border p-6">
            <div className="space-y-1.5">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-3 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </div>
      </div>
    </div>
  );
}
