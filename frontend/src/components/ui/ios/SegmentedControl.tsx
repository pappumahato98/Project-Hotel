import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SegmentedControl = ({ options, value, onChange, className }: SegmentedControlProps) => {
  return (
    <div className={cn(
      "relative p-1 bg-muted/40 backdrop-blur-md rounded-xl flex items-center border border-border/20",
      className
    )}>
      <div className="flex w-full relative">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex-1 py-1.5 text-xs font-semibold transition-colors duration-200",
              value === option.value ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            {option.label}
            {value === option.value && (
              <motion.div
                layoutId="segmented-active"
                className="absolute inset-0 bg-background rounded-lg shadow-sm -z-10 border border-border/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
