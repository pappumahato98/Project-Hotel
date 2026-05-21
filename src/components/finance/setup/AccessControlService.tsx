import { PermissionMatrix } from "../PermissionMatrix";
import { useFinancePermissions } from "@/hooks/useFinancePermissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function AccessControlService() {
  const { activeRole, setActiveRole } = useFinancePermissions('FA');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Access Control & Compliance</CardTitle>
          <CardDescription>Manage roles, permissions, maker-checker settings, and audit locks.</CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionMatrix
            currentRole={activeRole}
            onRoleChange={setActiveRole}
            simulationMode={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}
