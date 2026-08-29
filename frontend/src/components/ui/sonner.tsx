import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl rounded-2xl p-4",
          description: "group-[.toast]:text-muted-foreground font-medium",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-bold rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-bold rounded-lg",
          success: "group-[.toast]:!bg-success/5 group-[.toast]:!text-success group-[.toast]:!border-success/20",
          error: "group-[.toast]:!bg-destructive/5 group-[.toast]:!text-destructive group-[.toast]:!border-destructive/20",
          info: "group-[.toast]:!bg-info/5 group-[.toast]:!text-info group-[.toast]:!border-info/20",
          warning: "group-[.toast]:!bg-warning/5 group-[.toast]:!text-warning group-[.toast]:!border-warning/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
