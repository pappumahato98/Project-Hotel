import React from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface ThreeDLineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  width?: number;
}

export const ThreeDLineChart: React.FC<ThreeDLineChartProps> = ({
  data,
  color = "hsl(var(--primary))",
  height = 200,
  width = 600,
}) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const stepX = chartWidth / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padding + i * stepX,
    y: height - (padding + (d.value / maxValue) * chartHeight),
  }));

  // Create the main line path
  const linePath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );

  // Create the 3D ribbon effect (extruded path)
  const extrusionDepth = 8;
  const extrudedPath = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x + extrusionDepth} ${p.y - extrusionDepth}` : `${acc} L ${p.x + extrusionDepth} ${p.y - extrusionDepth}`),
    ""
  );

  // Connect the two lines to form a ribbon
  const ribbonPath = `${linePath} L ${points[points.length - 1].x + extrusionDepth} ${points[points.length - 1].y - extrusionDepth} ${extrudedPath.replace("M", "L")} L ${points[0].x} ${points[0].y} Z`;
  const id = React.useId();
  const gradientId = `ribbonGradient-${id.replace(/:/g, "")}`;
  const glowId = `glow-${id.replace(/:/g, "")}`;

  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible drop-shadow-2xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.3" />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1={padding}
            y1={height - padding - p * chartHeight}
            x2={width - padding}
            y2={height - padding - p * chartHeight}
            stroke="currentColor"
            className="text-border/30"
            strokeDasharray="4 4"
          />
        ))}

        {/* 3D Ribbon */}
        <path
          d={ribbonPath}
          fill={`url(#${gradientId})`}
          className="transition-all duration-1000 ease-in-out"
        />

        {/* Top Edge Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          filter={`url(#${glowId})`}
          className="transition-all duration-1000 ease-in-out"
        />

        {/* Data points (3D spheres/dots) */}
        {points.map((p, i) => (
          <g key={i} className="group cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill={color}
              className="group-hover:r-7 transition-all"
            />
            <circle
              cx={p.x + 2}
              cy={p.y - 2}
              r="2"
              fill="white"
              fillOpacity="0.5"
            />
          </g>
        ))}
      </svg>

      {/* X-Axis Labels */}
      <div className="flex justify-between w-full px-[40px] mt-2">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};
