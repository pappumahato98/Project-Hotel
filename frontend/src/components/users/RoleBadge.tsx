import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Shield, UserCog, User as UserIcon, AlertCircle } from "lucide-react";
import { AppRole, roleConfig } from "@/hooks/useUsersWithRoles";

interface RoleBadgeProps {
  role: AppRole;
  showIcon?: boolean;
}

export const RoleBadge = ({ role, showIcon = true }: RoleBadgeProps) => {
  const config = roleConfig[role];
  const icons: Record<AppRole, React.ComponentType<{ className?: string }>> = {
    admin: ShieldAlert,
    manager: Shield,
    staff: UserCog,
    user: UserIcon,
  };
  const Icon = icons[role];

  return (
    <Badge variant="outline" className={config.color}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
};

interface MultiRoleBadgeProps {
  count: number;
}

export const MultiRoleBadge = ({ count }: MultiRoleBadgeProps) => {
  return (
    <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
      <AlertCircle className="h-3 w-3 mr-1" />
      {count} roles
    </Badge>
  );
};
