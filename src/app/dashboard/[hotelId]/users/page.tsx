import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Manage Users</h1>
        <p className="text-muted-foreground">
          Control access for your hotel staff.
        </p>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>This feature is currently under construction.</CardDescription>
        </Header>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center p-8 md:p-16 bg-secondary rounded-lg">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-semibold">User Access Management</p>
              <p className="text-sm text-muted-foreground">Functionality to invite, approve, and manage user roles will be available here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
