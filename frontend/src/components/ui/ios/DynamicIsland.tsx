import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDesignSystem } from "@/components/theme/DesignSystemProvider";
import { Bell, Info, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DynamicIslandProps {
  message?: string;
  type?: "info" | "success" | "warning" | "error" | "loading";
  duration?: number;
  onClose?: () => void;
}

export const DynamicIsland = ({ message, type = "info", duration = 4000, onClose }: DynamicIslandProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { prefs } = useDesignSystem() as any;

  useEffect(() => {
    if (message && type !== "loading") {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, type, duration, onClose]);

  const icons = {
    info: <Info className="h-4 w-4 text-blue-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    error: <AlertTriangle className="h-4 w-4 text-rose-400" />,
    loading: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20, width: 100, height: 32 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: 0,
              width: isExpanded ? 320 : "auto",
              height: isExpanded ? "auto" : 32,
              transition: { type: "spring", stiffness: 300, damping: 25 }
            }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            className={cn(
              "pointer-events-auto cursor-default flex items-center justify-center gap-3 px-4 py-1.5 rounded-full shadow-2xl overflow-hidden",
              "bg-black/90 text-white backdrop-blur-2xl border border-white/10"
            )}
          >
            <div className="flex-shrink-0">{icons[type]}</div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[13px] font-medium whitespace-nowrap overflow-hidden"
            >
              {message}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
