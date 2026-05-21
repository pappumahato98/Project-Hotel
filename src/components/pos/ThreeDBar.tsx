import React from "react";

interface ThreeDBarProps {
  value: number;
  maxValue: number;
  label: string;
  color?: string;
  height?: number;
}

export const ThreeDBar: React.FC<ThreeDBarProps> = ({
  value,
  maxValue,
  label,
  color = "hsl(var(--primary))",
  height = 120
}) => {
  const percentage = Math.min(Math.max((value / maxValue) * 100, 5), 100);
  const barHeight = (percentage / 100) * height;
  const id = React.useId();
  const brightnessUpId = `pos-brightness-up-${id.replace(/:/g, "")}`;
  const brightnessDownId = `pos-brightness-down-${id.replace(/:/g, "")}`;

  return (
    <div className="flex flex-col items-center group cursor-default">
      <div
        className="relative w-12 transition-all duration-500 ease-out transform-gpu group-hover:scale-105"
        style={{ height: `${height}px` }}
      >
        <svg
          width="48"
          height={height}
          viewBox={`0 0 48 ${height}`}
          className="overflow-visible drop-shadow-xl"
        >
          <defs>
            <filter id={brightnessUpId}>
              <feComponentTransfer>
                <feFuncR type="linear" slope="1.4" />
                <feFuncG type="linear" slope="1.4" />
                <feFuncB type="linear" slope="1.4" />
              </feComponentTransfer>
            </filter>
            <filter id={brightnessDownId}>
              <feComponentTransfer>
                <feFuncR type="linear" slope="0.7" />
                <feFuncG type="linear" slope="0.7" />
                <feFuncB type="linear" slope="0.7" />
              </feComponentTransfer>
            </filter>
          </defs>

          {/* Background Column (Shadow/Track) */}
          <path
            d={`M 8 ${height - 5} L 40 ${height - 5} L 40 5 L 8 5 Z`}
            fill="currentColor"
            className="text-secondary/20"
          />

          {/* 3D Bar Front Face */}
          <rect
            x="8"
            y={height - barHeight}
            width="24"
            height={barHeight}
            fill={color}
            className="transition-all duration-700 ease-out"
          />

          {/* 3D Bar Side Face (Right) */}
          <path
            d={`M 32 ${height - barHeight} L 40 ${height - barHeight - 8} L 40 ${height - 8} L 32 ${height} Z`}
            fill={color}
            filter={`url(#${brightnessDownId})`}
            className="transition-all duration-700 ease-out"
          />

          {/* 3D Bar Top Face */}
          <path
            d={`M 8 ${height - barHeight} L 16 ${height - barHeight - 8} L 40 ${height - barHeight - 8} L 32 ${height - barHeight} Z`}
            fill={color}
            filter={`url(#${brightnessUpId})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Value Tooltip on Hover */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-10">
          ${value.toLocaleString()}
        </div>
      </div>
      <span className="mt-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
};
