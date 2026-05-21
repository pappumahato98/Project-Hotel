import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActionButton } from "./QuickActionButton";
import { LucideIcon } from "lucide-react";

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  color?: string;
  disabled?: boolean;
}

interface ModuleQuickActionsProps {
  title?: string;
  actions: QuickAction[];
  variant?: "grid" | "list";
  columns?: 2 | 3 | 4;
}

export function ModuleQuickActions({
  title = "Quick Actions",
  actions,
  variant = "grid",
  columns = 2,
}: ModuleQuickActionsProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {variant === "grid" ? (
          <div className={`grid ${gridCols[columns]} gap-3`}>
            {actions.map((action) => (
              <QuickActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                to={action.to}
                onClick={action.onClick}
                color={action.color}
                disabled={action.disabled}
                variant="default"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((action) => (
              <QuickActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                description={action.description}
                to={action.to}
                onClick={action.onClick}
                color={action.color}
                disabled={action.disabled}
                variant="compact"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
