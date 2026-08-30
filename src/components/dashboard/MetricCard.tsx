import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
  link?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  delay = 0,
  link,
}: MetricCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(delay / 1000, 0.3), ease: "easeOut" }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300",
          link && "cursor-pointer hover:shadow-elevated hover:border-primary/20"
        )}
      >
        {/* Subtle top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-blue opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold font-display text-foreground">{value}</p>
              {change && (
                <p
                  className={cn(
                    "text-xs font-medium",
                    changeType === "positive" && "text-success",
                    changeType === "negative" && "text-destructive",
                    changeType === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change}
                </p>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 group-hover:bg-primary/12 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
}
