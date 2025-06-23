import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  const renderSkeletonTable = () => (
     <div className="rounded-md border">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b">
              <th className="h-12 px-4 text-left"><Skeleton className="h-4 w-32" /></th>
              <th className="h-12 px-4 text-left"><Skeleton className="h-4 w-16" /></th>
              <th className="h-12 px-4 text-left"><Skeleton className="h-4 w-24" /></th>
              <th className="h-12 px-4 text-right"><Skeleton className="h-4 w-16" /></th>
            </tr>
          </thead>
          <tbody>
            {[...Array(2)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="p-4"><Skeleton className="h-5 w-48" /></td>
                <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                <td className="p-4 flex justify-end gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-20" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-96" />
        </div>
        <div>
            {renderSkeletonTable()}
        </div>
      </div>

       <div className="space-y-4">
        <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
        </div>
        <div>
            {renderSkeletonTable()}
        </div>
      </div>
    </div>
  );
}
