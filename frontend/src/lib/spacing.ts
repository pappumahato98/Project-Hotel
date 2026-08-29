export const Spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const GridGap = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-5",
  "2xl": "gap-6",
  "3xl": "gap-8",
  "4xl": "gap-10",
} as const;

export const FlexGap = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-5",
  "2xl": "gap-6",
  "3xl": "gap-8",
} as const;

export const Padding = {
  none: "p-0",
  xs: "p-1",
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
  xl: "p-5",
  "2xl": "p-6",
  "3xl": "p-8",
} as const;

export const Margin = {
  none: "m-0",
  xs: "m-1",
  sm: "m-2",
  md: "m-3",
  lg: "m-4",
  xl: "m-5",
  "2xl": "m-6",
  "3xl": "m-8",
} as const;

export type SpacingKey = keyof typeof Spacing;
export type GridGapKey = keyof typeof GridGap;
export type FlexGapKey = keyof typeof FlexGap;
export type PaddingKey = keyof typeof Padding;
export type MarginKey = keyof typeof Margin;

export const layout = {
  container: "p-4 sm:p-6",
  section: "space-y-4",
  card: "gap-4",
  grid: "gap-4 sm:gap-6",
  flex: "gap-2 sm:gap-4",
  sidebar: "p-2 gap-1",
  header: "gap-2",
  toolbar: "gap-2",
  list: "gap-1",
  table: "gap-0",
  dialog: "space-y-4",
  form: "space-y-4",
  buttonGroup: "gap-2",
} as const;

export const responsive = {
  grid: {
    cols: {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
    },
    sm: {
      cols: {
        1: "sm:grid-cols-1",
        2: "sm:grid-cols-2",
        3: "sm:grid-cols-3",
        4: "sm:grid-cols-4",
        5: "sm:grid-cols-5",
        6: "sm:grid-cols-6",
      },
      gap: {
        sm: "sm:gap-2",
        md: "sm:gap-3",
        lg: "sm:gap-4",
        xl: "sm:gap-5",
        "2xl": "sm:gap-6",
      },
    },
    md: {
      cols: {
        1: "md:grid-cols-1",
        2: "md:grid-cols-2",
        3: "md:grid-cols-3",
        4: "md:grid-cols-4",
        5: "md:grid-cols-5",
        6: "md:grid-cols-6",
      },
      gap: {
        sm: "md:gap-2",
        md: "md:gap-3",
        lg: "md:gap-4",
        xl: "md:gap-5",
        "2xl": "md:gap-6",
      },
    },
    lg: {
      cols: {
        1: "lg:grid-cols-1",
        2: "lg:grid-cols-2",
        3: "lg:grid-cols-3",
        4: "lg:grid-cols-4",
        5: "lg:grid-cols-5",
        6: "lg:grid-cols-6",
      },
      gap: {
        sm: "lg:gap-2",
        md: "lg:gap-3",
        lg: "lg:gap-4",
        xl: "lg:gap-5",
        "2xl": "lg:gap-6",
      },
    },
  },
  flex: {
    direction: {
      row: "flex-row",
      col: "flex-col",
      "row-reverse": "flex-row-reverse",
      "col-reverse": "flex-col-reverse",
    },
    wrap: {
      wrap: "flex-wrap",
      nowrap: "flex-nowrap",
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
    },
  },
} as const;