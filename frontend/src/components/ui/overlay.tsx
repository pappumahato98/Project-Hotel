import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const overlayVariants = cva(
  "relative",
  {
    variants: {
      variant: {
        default: "",
        contrast: "bg-background/90 dark:bg-background/95 backdrop-blur-sm",
        solid: "bg-background",
        glass: "bg-card/60 backdrop-blur-md border border-border/40",
        dark: "bg-black/80 backdrop-blur-sm",
        light: "bg-white/80 backdrop-blur-sm",
        shimmer: "bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5",
      },
      intensity: {
        low: "",
        medium: "bg-background/80 dark:bg-background/90",
        high: "bg-background/95 dark:bg-background/95",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      intensity: "medium",
      rounded: "default",
    },
  }
);

export interface OverlayProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof overlayVariants> {
  asChild?: boolean;
}

const Overlay = React.forwardRef<HTMLDivElement, OverlayProps>(
  ({ className, variant, intensity, rounded, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        overlayVariants({ variant, intensity, rounded, className })
      )}
      {...props}
    />
  )
);
Overlay.displayName = "Overlay";

function OverlayBrackets({ 
  className, 
  children,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "relative before:absolute before:inset-0 before:border-l-2 before:border-r-2 before:border-primary/30 before:rounded-sm after:absolute after:inset-0 after:border-t-2 after:border-b-2 after:border-primary/30 after:rounded-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function OverlayGradient({ 
  className, 
  children,
  direction = "to-r",
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { direction?: "to-r" | "to-l" | "to-t" | "to-b" | "to-tr" | "to-tl" | "to-br" | "to-bl" }) {
  return (
    <div 
      className={cn(
        "relative",
        className
      )}
      {...props}
    >
      <div className={cn(
        "absolute inset-0 bg-gradient-gradient opacity-[0.03] dark:opacity-[0.08]",
        `bg-gradient-${direction}`
      )} />
      {children}
    </div>
  );
}

export { Overlay, OverlayBrackets, OverlayGradient, overlayVariants };

const textOverlayVariants = cva(
  "relative inline-block",
  {
    variants: {
      variant: {
        default: "",
        box: "bg-background/90 dark:bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded",
        card: "bg-card/90 dark:bg-card/95 backdrop-blur-sm px-2 py-1 rounded-md border border-border/30",
        spotlight: "bg-gradient-to-r from-background/80 via-background/60 to-background/80 dark:from-background/90 dark:via-background/80 dark:to-background/90",
        outline: "border border-border/50 bg-background/50 dark:bg-background/80 rounded px-2 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface TextOverlayProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof textOverlayVariants> {}

const TextOverlay = React.forwardRef<HTMLSpanElement, TextOverlayProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(textOverlayVariants({ variant, className }))}
      {...props}
    />
  )
);
TextOverlay.displayName = "TextOverlay";

export { TextOverlay, textOverlayVariants };