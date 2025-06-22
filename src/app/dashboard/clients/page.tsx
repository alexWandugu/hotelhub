import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Clients</h1>
        <p className="text-muted-foreground">
          Manage clients associated with your partners.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>This feature is currently under construction.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-16 bg-secondary rounded-lg">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-semibold">Client Management</p>
              <p className="text-sm text-muted-foreground">Functionality to add, view, and manage clients will be available here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
