import React from "react";
import { motion } from "framer-motion";

interface SpringTransitionProps {
  children: React.ReactNode;
  className?: string;
  type?: "fade" | "slide" | "scale";
}

export const SpringTransition = ({ children, className, type = "fade" }: SpringTransitionProps) => {
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slide: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.98 },
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants[type]}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
