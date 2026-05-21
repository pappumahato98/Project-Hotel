import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  to?: string;
  onClick?: () => void;
  variant?: "default" | "compact" | "card";
  color?: string;
  disabled?: boolean;
}

export function QuickActionButton({
  icon: Icon,
  label,
  description,
  to,
  onClick,
  variant = "default",
  color = "text-primary",
  disabled = false,
}: QuickActionButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    }
  };

  if (variant === "compact") {
    return (
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={handleClick}
        disabled={disabled}
      >
        <Icon className={cn("h-4 w-4", color)} />
        {label}
      </Button>
    );
  }

  if (variant === "card") {
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
          "bg-card hover:bg-secondary/50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className={cn("h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center")}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground text-center">{description}</span>
        )}
      </button>
    );
  }

  // Default variant
  return (
    <Button
      variant="secondary"
      className="h-auto py-4 flex-col gap-2 hover:bg-secondary/80"
      onClick={handleClick}
      disabled={disabled}
    >
      <Icon className={cn("h-5 w-5", color)} />
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}
