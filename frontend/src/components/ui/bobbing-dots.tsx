import React from 'react';
import { cn } from '@/lib/utils';

interface BobbingDotsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function BobbingDots({ className, ...props }: BobbingDotsProps) {
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)} {...props}>
      <style>
        {`
          @keyframes bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .bobbing-dot {
            animation: bob 1s infinite ease-in-out;
          }
          .bobbing-dot:nth-child(1) { animation-delay: 0s; }
          .bobbing-dot:nth-child(2) { animation-delay: 0.2s; }
          .bobbing-dot:nth-child(3) { animation-delay: 0.4s; }
        `}
      </style>
      <div className="w-3 h-3 bg-primary rounded-full bobbing-dot" />
      <div className="w-3 h-3 bg-primary rounded-full bobbing-dot" />
      <div className="w-3 h-3 bg-primary rounded-full bobbing-dot" />
    </div>
  );
}
