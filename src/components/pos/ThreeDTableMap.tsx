import React from "react";
import { cn } from "@/lib/utils";

interface Table {
  id: string;
  number: string;
  status: "available" | "occupied" | "reserved" | "billing";
  capacity: number;
  x: number;
  y: number;
}

interface ThreeDTableMapProps {
  tables?: Table[];
}

export const ThreeDTableMap: React.FC<ThreeDTableMapProps> = ({ tables: propTables }) => {
  // Use provided tables or empty array
  const tables: Table[] = propTables || [];

  const statusColors = {
    available: "hsl(var(--success))",
    occupied: "hsl(var(--primary))",
    reserved: "hsl(var(--info))",
    billing: "hsl(var(--primary))",
  };

  const getIsoCoords = (x: number, y: number) => {
    return {
      nx: (x - y) + 200, // Center offset
      ny: (x + y) / 2 + 50,
    };
  };

  const id = React.useId();
  const shadowId = `table-shadow-${id.replace(/:/g, "")}`;

  return (
    <div className="relative w-full h-[320px] bg-secondary/5 rounded-xl overflow-hidden flex items-center justify-center">
      {tables.length === 0 ? (
        <div className="text-center text-muted-foreground italic text-sm">
          No table data available for floor plan
        </div>
      ) : (
        <>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 500 350"
            className="overflow-visible"
          >
            <defs>
              <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                <feOffset dx="2" dy="4" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Floor Grid (Isometric) */}
            <path
              d="M 200 50 L 400 150 L 200 250 L 0 150 Z"
              fill="none"
              stroke="currentColor"
              className="text-border/20"
              strokeWidth="1"
            />

            {/* Tables */}
            {tables.map((table) => {
              const { nx, ny } = getIsoCoords(table.x, table.y);
              const color = statusColors[table.status];
              const size = table.capacity > 4 ? 40 : 30;

              return (
                <g key={table.id} className="group cursor-pointer transition-transform duration-300 hover:-translate-y-2">
                  {/* Table Legs/Body (Extrusion) */}
                  <path
                    d={`M ${nx - size / 2} ${ny} L ${nx - size / 2} ${ny + 10} L ${nx + size / 2} ${ny + 10} L ${nx + size / 2} ${ny} Z`}
                    fill={color}
                    filter="brightness(0.7)"
                  />

                  {/* Table Top (Isometric Square/Diamond) */}
                  <path
                    d={`M ${nx} ${ny - size / 2} L ${nx + size} ${ny} L ${nx} ${ny + size / 2} L ${nx - size} ${ny} Z`}
                    fill={color}
                    filter={`url(#${shadowId})`}
                    className="transition-colors duration-300 group-hover:filter-none"
                  />

                  {/* Table Number */}
                  <text
                    x={nx}
                    y={ny + 4}
                    textAnchor="middle"
                    fill="white"
                    className="text-[10px] font-bold select-none"
                  >
                    {table.number}
                  </text>

                  {/* Tooltip on Hover */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <rect
                      x={nx - 40}
                      y={ny - 60}
                      width="80"
                      height="30"
                      rx="4"
                      fill="hsl(var(--popover))"
                      className="shadow-xl"
                    />
                    <text
                      x={nx}
                      y={ny - 40}
                      textAnchor="middle"
                      fill="currentColor"
                      className="text-[9px] font-medium"
                    >
                      {table.status.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-1">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] uppercase tracking-tighter text-muted-foreground">{status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
