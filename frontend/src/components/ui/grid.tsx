import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const gridVariants = cva("grid", {
  variants: {
    cols: {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      none: "grid-cols-none",
    },
    gap: {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
      xl: "gap-5",
      "2xl": "gap-6",
      "3xl": "gap-8",
      "4xl": "gap-10",
    },
    gapX: {
      none: "gap-x-0",
      xs: "gap-x-1",
      sm: "gap-x-2",
      md: "gap-x-3",
      lg: "gap-x-4",
      xl: "gap-x-5",
      "2xl": "gap-x-6",
      "3xl": "gap-x-8",
    },
    gapY: {
      none: "gap-y-0",
      xs: "gap-y-1",
      sm: "gap-y-2",
      md: "gap-y-3",
      lg: "gap-y-4",
      xl: "gap-y-5",
      "2xl": "gap-y-6",
      "3xl": "gap-y-8",
    },
  },
  defaultVariants: {
    cols: 1,
    gap: "md",
  },
});

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | "none";
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  gapX?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  gapY?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols, gap, gapX, gapY, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(gridVariants({ cols, gap, gapX, gapY, className }))}
      {...props}
    />
  )
);
Grid.displayName = "Grid";

const flexVariants = cva("flex", {
  variants: {
    direction: {
      row: "flex-row",
      col: "flex-col",
      "row-reverse": "flex-row-reverse",
      "col-reverse": "flex-col-reverse",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
      baseline: "items-baseline",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
      evenly: "justify-evenly",
    },
    wrap: {
      wrap: "flex-wrap",
      nowrap: "flex-nowrap",
      "wrap-reverse": "flex-wrap-reverse",
    },
    gap: {
      none: "gap-0",
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
      xl: "gap-5",
      "2xl": "gap-6",
      "3xl": "gap-8",
    },
  },
  defaultVariants: {
    direction: "row",
    align: "stretch",
    justify: "start",
    wrap: "nowrap",
    gap: "md",
  },
});

export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
  direction?: "row" | "col" | "row-reverse" | "col-reverse";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: "wrap" | "nowrap" | "wrap-reverse";
  gap?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ className, direction, align, justify, wrap, gap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(flexVariants({ direction, align, justify, wrap, gap, className }))}
      {...props}
    />
  )
);
Flex.displayName = "Flex";

const spaceVariants = cva("", {
  variants: {
    size: {
      none: "space-y-0",
      xs: "space-y-1",
      sm: "space-y-2",
      md: "space-y-3",
      lg: "space-y-4",
      xl: "space-y-5",
      "2xl": "space-y-6",
      "3xl": "space-y-8",
      "4xl": "space-y-10",
    },
    direction: {
      y: "",
      x: "space-x-0",
    },
  },
  defaultVariants: {
    size: "md",
    direction: "y",
  },
});

export interface SpaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spaceVariants> {
  size?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  direction?: "y" | "x";
}

const Space = React.forwardRef<HTMLDivElement, SpaceProps>(
  ({ className, size, direction, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(spaceVariants({ size, direction, className }))}
      {...props}
    />
  )
);
Space.displayName = "Space";

export { Grid, Flex, Space, gridVariants, flexVariants, spaceVariants };