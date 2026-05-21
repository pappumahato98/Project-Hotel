import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./GlobalHeader";
import { PageTransition } from "./PageTransition";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { useUIPreferences } from "@/hooks/useSettings";
import { HorizontalNav } from "./header/HorizontalNav";
import { AnimatePresence } from "framer-motion";

export interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  fixedHeight?: boolean;
}

export function MainLayout({ children, title, subtitle, actions, fixedHeight = false }: MainLayoutProps) {
  const { collapsed, isMobile } = useSidebar();
  const { data: uiPrefs } = useUIPreferences();
  const navStyle = uiPrefs?.navigation_style || "default";

  const isHorizontal = navStyle === "horizontal-subheader" && !isMobile;
  const isHiddenHover = navStyle === "hidden-hover" && !isMobile;
  const isVerticalIcon = navStyle === "vertical-icon" && !isMobile;

  const getMarginLeft = () => {
    if (isMobile || isHorizontal || isHiddenHover) return "ml-0";
    if (isVerticalIcon) return "ml-[70px]";
    return collapsed ? "ml-20" : "ml-64";
  };

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col pt-14">
      <Header title={title} subtitle={subtitle} />
      <Sidebar />
      <div 
        className={cn(
          "transition-[margin] duration-300 ease-in-out flex-1 flex flex-col h-full overflow-hidden",
          getMarginLeft()
        )}
      >
        <AnimatePresence mode="wait">
          {isHorizontal && <HorizontalNav />}
        </AnimatePresence>
        <main className={cn(
          "flex-1 overflow-x-hidden scrollbar-hide",
          fixedHeight ? "overflow-hidden flex flex-col" : "overflow-y-auto"
        )}>
          <PageTransition className={cn(fixedHeight ? "h-full flex flex-col" : "min-h-full flex flex-col")}>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
