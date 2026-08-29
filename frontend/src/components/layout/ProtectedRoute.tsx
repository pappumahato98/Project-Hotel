import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { data: lockdownEnabled, isLoading: loadingSettings } = useSettings<boolean>("system_lockdown", false);
  const { isAdmin, isLoading: loadingRole } = useIsAdmin();

  if (loading || loadingSettings || loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (lockdownEnabled && !isAdmin && location.pathname !== "/auth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">System Lockdown Active</h1>
            <p className="text-muted-foreground">
              The system is currently undergoing emergency maintenance or security lockdown.
              Only administrators can access the console at this time.
            </p>
          </div>
          <div className="pt-4">
            <Button onClick={() => window.location.href = "/auth"}>
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
