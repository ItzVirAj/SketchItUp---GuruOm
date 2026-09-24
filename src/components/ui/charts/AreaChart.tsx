import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useMemo,
  useCallback,
  useId,
  useEffect
} from 'react';

// Context interface for composable chart components
export interface ChartContextValue {
  data: Record<string, any>[];
  xDataKey: string;
  activePointIndex: number | null;
  activePoint: Record<string, any> | null;
  setActivePointIndex: (idx: number | null) => void;
  hoverPos: { x: number; y: number } | null;
  setHoverPos: (pos: { x: number; y: number } | null) => void;
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  chartId: string;
  yMin: number;
  yMax: number;
  getX: (index: number) => number;
  getY: (val: number) => number;
  series: Map<string, { fill: string; stroke: string; strokeWidth: number }>;
  registerSeries: (key: string, meta: { fill: string; stroke: string; strokeWidth: number }) => void;
}

const ChartContext = createContext<ChartContextValue | null>(null);

export function useChart(): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    throw new Error('useChart must be used within an <AreaChart>');
  }
  return ctx;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Math Utilities for Smooth Monotone Cubic Bezier Curves
───────────────────────────────────────────────────────────────────────────── */
function getControlPoint(
  current: [number, number],
  previous: [number, number],
  next: [number, number],
  reverse = false
): [number, number] {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.2;
  const opposedX = n[0] - p[0];
  const opposedY = n[1] - p[1];
  const angle = Math.atan2(opposedY, opposedX) + (reverse ? Math.PI : 0);
  const length = Math.sqrt(Math.pow(n[0] - p[0], 2) + Math.pow(n[1] - p[1], 2)) * smoothing;
  const x = current[0] + Math.cos(angle) * length;
  const y = current[1] + Math.sin(angle) * length;
  return [x, y];
}

function createSvgPath(points: [number, number][]): string {
  if (!points || points.length === 0) return '';
  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point[0]},${point[1]}`;
    const [cpsX, cpsY] = getControlPoint(a[i - 1], a[i - 2], point);
    const [cpeX, cpeY] = getControlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
  }, '');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Root Component: AreaChart
───────────────────────────────────────────────────────────────────────────── */
export interface AreaChartProps {
  data: Record<string, any>[];
  xDataKey?: string;
  margin?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  aspectRatio?: string;
  className?: string;
  style?: React.CSSProperties;
  status?: 'loading' | 'ready';
  loadingLabel?: string;
  children: React.ReactNode;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data = [],
  xDataKey = 'date',
  margin: customMargin,
  aspectRatio,
  className = '',
  style,
  status = 'ready',
  loadingLabel = 'Loading revenue data…',
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 260 });
  const [activePointIndex, setActivePointIndex] = useState<number | null>(() => (data && data.length > 4 ? Math.floor(data.length * 0.45) : null));
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [series] = useState(() => new Map<string, { fill: string; stroke: string; strokeWidth: number }>());
  const generatedId = useId();
  const chartId = `area-chart-${generatedId.replace(/:/g, '')}`;

  const margin = useMemo(() => ({
    top: customMargin?.top ?? 20,
    right: customMargin?.right ?? 16,
    bottom: customMargin?.bottom ?? 32,
    left: customMargin?.left ?? 16
  }), [customMargin]);

  // Responsive container observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0) {
          setDimensions({
            width: Math.floor(width),
            height: height > 60 ? Math.floor(height) : 200
          });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const registerSeries = useCallback((key: string, meta: { fill: string; stroke: string; strokeWidth: number }) => {
    series.set(key, meta);
  }, [series]);

  // Compute y bounds across registered keys or all numeric values
  const { yMin, yMax } = useMemo(() => {
    if (!data || data.length === 0) return { yMin: 0, yMax: 100 };
    let min = Infinity;
    let max = -Infinity;

    for (const d of data) {
      for (const [k, v] of Object.entries(d)) {
        if (k !== xDataKey && typeof v === 'number' && !isNaN(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }

    if (min === Infinity || max === -Infinity) return { yMin: 0, yMax: 100 };
    // Add 10% headroom
    const padding = (max - min) * 0.1 || max * 0.1 || 10;
    return {
      yMin: Math.max(0, Math.floor(min - padding)),
      yMax: Math.ceil(max + padding)
    };
  }, [data, xDataKey]);

  const plotWidth = Math.max(10, dimensions.width - margin.left - margin.right);
  const plotHeight = Math.max(10, dimensions.height - margin.top - margin.bottom);

  const getX = useCallback((index: number) => {
    if (data.length <= 1) return margin.left + plotWidth / 2;
    return margin.left + (index / (data.length - 1)) * plotWidth;
  }, [data.length, margin.left, plotWidth]);

  const getY = useCallback((val: number) => {
    if (yMax === yMin) return margin.top + plotHeight / 2;
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const pct = (clamped - yMin) / (yMax - yMin);
    return margin.top + plotHeight - pct * plotHeight;
  }, [yMax, yMin, margin.top, plotHeight]);

  // Mouse & touch interaction handling
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const clampedX = Math.max(margin.left, Math.min(dimensions.width - margin.right, clientX));
    const plotX = clampedX - margin.left;
    const step = plotWidth / Math.max(1, data.length - 1);
    const nearestIndex = Math.max(0, Math.min(data.length - 1, Math.round(plotX / step)));

    setActivePointIndex(nearestIndex);
    setHoverPos({ x: getX(nearestIndex), y: clientY });
  };

  const handlePointerLeave = () => {
    setActivePointIndex(null);
    setHoverPos(null);
  };

  const activePoint = activePointIndex !== null && data[activePointIndex] ? data[activePointIndex] : null;

  const contextValue: ChartContextValue = useMemo(() => ({
    data,
    xDataKey,
    activePointIndex,
    activePoint,
    setActivePointIndex,
    hoverPos,
    setHoverPos,
    width: dimensions.width,
    height: dimensions.height,
    margin,
    chartId,
    yMin,
    yMax,
    getX,
    getY,
    series,
    registerSeries
  }), [
    data,
    xDataKey,
    activePointIndex,
    activePoint,
    setActivePointIndex,
    hoverPos,
    setHoverPos,
    dimensions.width,
    dimensions.height,
    margin,
    chartId,
    yMin,
    yMax,
    getX,
    getY,
    series,
    registerSeries
  ]);

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          aspectRatio: aspectRatio || undefined,
          minHeight: style?.minHeight ?? (style?.height ? undefined : '240px'),
          ...style
        }}
        className={`relative w-full select-none overflow-hidden font-sans ${className}`}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--chart-background,#ffffff)]/60 backdrop-blur-xs dark:bg-[#121215]/60 transition-opacity duration-300">
            <div className="flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-[#5B75F8] dark:text-[#7B92FF] shadow-xs">
              <span className="h-2 w-2 animate-ping rounded-full bg-blue-500" />
              <span>{loadingLabel}</span>
            </div>
          </div>
        )}

        <svg
          className="w-full h-full block overflow-visible pointer-events-none"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {children}
        </svg>
      </div>
    </ChartContext.Provider>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DayColumns (Vertical capsule pills matching reference design)
───────────────────────────────────────────────────────────────────────────── */
export interface DayColumnsProps {
  activeFill?: string;
  defaultFill?: string;
  className?: string;
}

export const DayColumns: React.FC<DayColumnsProps> = ({
  activeFill = 'rgba(15, 118, 110, 0.08)',
  defaultFill = 'rgba(0, 0, 0, 0.015)',
  className = ''
}) => {
  const { data, getX, height, margin, activePointIndex, width } = useChart();
  if (!data || data.length === 0) return null;
  const colWidth = Math.max(16, Math.min(52, ((width - margin.left - margin.right) / Math.max(1, data.length)) * 0.72));
  const plotTop = margin.top;
  const plotHeight = height - margin.top - margin.bottom;

  return (
    <g className={`chart-day-columns ${className}`}>
      {data.map((_, idx) => {
        const x = getX(idx) - colWidth / 2;
        const isActive = activePointIndex === idx;
        return (
          <rect
            key={`col-pill-${idx}`}
            x={x}
            y={plotTop}
            width={colWidth}
            height={plotHeight}
            rx={colWidth / 2}
            fill={isActive ? activeFill : defaultFill}
            className="transition-colors duration-150"
          />
        );
      })}
    </g>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Grid Component
───────────────────────────────────────────────────────────────────────────── */
export interface GridProps {
  horizontal?: boolean;
  vertical?: boolean;
  numTicksRows?: number;
  numTicksColumns?: number;
  stroke?: string;
  strokeDasharray?: string;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  horizontal = true,
  vertical = false,
  numTicksRows = 5,
  numTicksColumns = 8,
  stroke = 'var(--chart-grid, rgba(226, 232, 240, 0.8))',
  strokeDasharray = '4,4',
  className = ''
}) => {
  const { width, height, margin } = useChart();
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const rowYs = useMemo(() => {
    const ys: number[] = [];
    for (let i = 0; i <= numTicksRows; i++) {
      ys.push(margin.top + (i / numTicksRows) * plotHeight);
    }
    return ys;
  }, [numTicksRows, margin.top, plotHeight]);

  const colXs = useMemo(() => {
    const xs: number[] = [];
    if (!vertical) return xs;
    for (let i = 0; i <= numTicksColumns; i++) {
      xs.push(margin.left + (i / numTicksColumns) * plotWidth);
    }
    return xs;
  }, [vertical, numTicksColumns, margin.left, plotWidth]);

  return (
    <g className={`chart-grid ${className}`}>
      {horizontal &&
        rowYs.map((y, idx) => (
          <line
            key={`h-grid-${idx}`}
            x1={margin.left}
            y1={y}
            x2={margin.left + plotWidth}
            y2={y}
            stroke={stroke}
            strokeDasharray={strokeDasharray}
            strokeWidth={1}
            strokeOpacity={0.8}
          />
        ))}

      {vertical &&
        colXs.map((x, idx) => (
          <line
            key={`v-grid-${idx}`}
            x1={x}
            y1={margin.top}
            x2={x}
            y2={margin.top + plotHeight}
            stroke={stroke}
            strokeDasharray={strokeDasharray}
            strokeWidth={1}
            strokeOpacity={0.8}
          />
        ))}
    </g>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Area Component with Gradient Fills & Edge Fade
───────────────────────────────────────────────────────────────────────────── */
export interface AreaProps {
  dataKey: string;
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  gradientToOpacity?: number;
  fadeEdges?: boolean;
  showLine?: boolean;
  showHighlight?: boolean;
  dashFromIndex?: number;
  dashArray?: string;
  className?: string;
}

export const Area: React.FC<AreaProps> = ({
  dataKey,
  fill = 'var(--chart-line-primary, #435BE8)',
  fillOpacity = 0.35,
  stroke,
  strokeWidth = 2,
  gradientToOpacity = 0.0,
  fadeEdges = false,
  showLine = true,
  showHighlight = true,
  dashFromIndex,
  dashArray = '6,4',
  className = ''
}) => {
  const { data, getX, getY, height, margin, chartId, registerSeries, activePointIndex, activePoint } = useChart();
  const effectiveStroke = stroke || fill;
  const gradientId = `${chartId}-grad-${dataKey}`;
  const maskId = fadeEdges ? `${chartId}-mask-${dataKey}` : undefined;

  useEffect(() => {
    registerSeries(dataKey, { fill, stroke: effectiveStroke, strokeWidth });
  }, [dataKey, fill, effectiveStroke, strokeWidth]);

  const points = useMemo<[number, number][]>(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, i) => {
      const val = Number(d[dataKey] ?? 0);
      return [getX(i), getY(val)];
    });
  }, [data, dataKey, getX, getY]);

  const baselineY = height - margin.bottom;

  const { areaPath, linePath, solidLinePath, dashedLinePath } = useMemo(() => {
    if (points.length === 0) {
      return { areaPath: '', linePath: '', solidLinePath: '', dashedLinePath: '' };
    }

    const curveD = createSvgPath(points);
    const firstX = points[0][0];
    const lastX = points[points.length - 1][0];
    const fullArea = `${curveD} L ${lastX.toFixed(2)},${baselineY.toFixed(2)} L ${firstX.toFixed(2)},${baselineY.toFixed(2)} Z`;

    if (typeof dashFromIndex === 'number' && dashFromIndex > 0 && dashFromIndex < points.length) {
      const solidPoints = points.slice(0, dashFromIndex + 1);
      const dashedPoints = points.slice(dashFromIndex);
      return {
        areaPath: fullArea,
        linePath: curveD,
        solidLinePath: createSvgPath(solidPoints),
        dashedLinePath: createSvgPath(dashedPoints)
      };
    }

    return { areaPath: fullArea, linePath: curveD, solidLinePath: curveD, dashedLinePath: '' };
  }, [points, baselineY, dashFromIndex]);

  const activeCoord = useMemo(() => {
    if (activePointIndex === null || !points[activePointIndex]) return null;
    return points[activePointIndex];
  }, [activePointIndex, points]);

  return (
    <g className={`chart-area-group ${className}`}>
      <defs>
        {/* Vertical Gradient for Fill */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={fillOpacity} />
          <stop offset="65%" stopColor={fill} stopOpacity={fillOpacity * 0.35} />
          <stop offset="100%" stopColor={fill} stopOpacity={gradientToOpacity} />
        </linearGradient>

        {/* Optional Edge Fade Mask (fadeEdges prop) */}
        {fadeEdges && (
          <mask id={maskId}>
            <linearGradient id={`${maskId}-grad`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="8%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="92%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
            <rect x="0" y="0" width="100%" height="100%" fill={`url(#${maskId}-grad)`} />
          </mask>
        )}
      </defs>

      {/* Filled Area */}
      {areaPath && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          mask={maskId ? `url(#${maskId})` : undefined}
          className="transition-opacity duration-300"
        />
      )}

      {/* Solid or Split Stroke Lines */}
      {showLine && solidLinePath && (
        <path
          d={solidLinePath}
          fill="none"
          stroke={effectiveStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          mask={maskId ? `url(#${maskId})` : undefined}
          className="transition-all duration-300"
        />
      )}

      {showLine && dashedLinePath && (
        <path
          d={dashedLinePath}
          fill="none"
          stroke={effectiveStroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          strokeLinejoin="round"
          mask={maskId ? `url(#${maskId})` : undefined}
          className="transition-all duration-300 opacity-80"
        />
      )}

      {/* Active hover dot highlight */}
      {showHighlight && activeCoord && (
        <g className="transition-transform duration-100 ease-out">
          <circle
            cx={activeCoord[0]}
            cy={activeCoord[1]}
            r={6}
            fill={effectiveStroke}
            fillOpacity={0.25}
            className="animate-ping origin-center"
          />
          <circle
            cx={activeCoord[0]}
            cy={activeCoord[1]}
            r={5}
            fill="var(--chart-background, #ffffff)"
            stroke={effectiveStroke}
            strokeWidth={2.5}
            className="shadow-sm"
          />
        </g>
      )}
    </g>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   XAxis Component
───────────────────────────────────────────────────────────────────────────── */
export interface XAxisProps {
  numTicks?: number;
  tickFormatter?: (value: any, index: number) => string;
  className?: string;
}

export const XAxis: React.FC<XAxisProps> = ({
  numTicks = 6,
  tickFormatter,
  className = ''
}) => {
  const { data, xDataKey, getX, height, margin } = useChart();

  const ticks = useMemo(() => {
    if (!data || data.length === 0) return [];
    const count = Math.min(numTicks, data.length);
    if (count <= 1) {
      return [{ index: 0, x: getX(0), val: data[0][xDataKey] }];
    }

    const step = (data.length - 1) / (count - 1);
    const result = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.min(data.length - 1, Math.round(i * step));
      result.push({ index: idx, x: getX(idx), val: data[idx][xDataKey] });
    }
    return result;
  }, [data, xDataKey, numTicks, getX]);

  const defaultFormat = (val: any): string => {
    if (val instanceof Date) {
      return val.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }
      return val;
    }
    return String(val ?? '');
  };

  const format = tickFormatter || defaultFormat;
  const labelY = height - margin.bottom + 18;

  return (
    <g className={`chart-x-axis ${className}`}>
      {ticks.map((t, idx) => {
        const text = format(t.val, t.index);
        return (
          <text
            key={`x-tick-${idx}`}
            x={t.x}
            y={labelY}
            textAnchor="middle"
            fill="var(--chart-foreground-muted, #64748b)"
            className="text-[10px] font-medium tracking-wide dark:fill-slate-400 select-none"
          >
            {text}
          </text>
        );
      })}
    </g>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   YAxis Component
───────────────────────────────────────────────────────────────────────────── */
export interface YAxisProps {
  numTicks?: number;
  tickFormatter?: (value: number) => string;
  orientation?: 'left' | 'right';
  className?: string;
}

export const YAxis: React.FC<YAxisProps> = ({
  numTicks = 4,
  tickFormatter,
  orientation = 'right',
  className = ''
}) => {
  const { width, margin, yMin, yMax, getY } = useChart();

  const ticks = useMemo(() => {
    const list: { val: number; y: number }[] = [];
    for (let i = 0; i <= numTicks; i++) {
      const val = yMin + (i / numTicks) * (yMax - yMin);
      list.push({ val, y: getY(val) });
    }
    return list;
  }, [numTicks, yMin, yMax, getY]);

  const defaultFormat = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
    return `₹${Math.round(v)}`;
  };

  const format = tickFormatter || defaultFormat;
  const textX = orientation === 'right' ? width - margin.right : margin.left;
  const textAnchor = orientation === 'right' ? 'end' : 'start';

  return (
    <g className={`chart-y-axis ${className}`}>
      {ticks.map((t, idx) => (
        <text
          key={`y-tick-${idx}`}
          x={textX}
          y={t.y - 4}
          textAnchor={textAnchor}
          fill="var(--chart-foreground-muted, #64748b)"
          className="text-[9px] font-mono font-medium dark:fill-slate-400 select-none"
        >
          {format(t.val)}
        </text>
      ))}
    </g>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   ChartTooltip Component with Crosshair, Date Pill & Floating Card
───────────────────────────────────────────────────────────────────────────── */
export interface ChartTooltipProps {
  showDatePill?: boolean;
  showCrosshair?: boolean;
  showDots?: boolean;
  indicatorColor?: string;
  currencySymbol?: string;
  content?: (props: { activePoint: Record<string, any> | null; index: number | null }) => React.ReactNode;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  showDatePill = true,
  showCrosshair = true,
  showDots = true,
  indicatorColor = 'var(--chart-crosshair, #435BE8)',
  currencySymbol = '₹',
  content
}) => {
  const { hoverPos, activePoint, activePointIndex, height, margin, width, series, xDataKey } = useChart();

  if (!hoverPos || !activePoint || activePointIndex === null) {
    return null;
  }

  const plotTop = margin.top;
  const plotBottom = height - margin.bottom;

  // Format date for pill and tooltip header
  const rawDate = activePoint[xDataKey];
  let formattedDate = '';
  if (rawDate instanceof Date) {
    formattedDate = rawDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } else if (typeof rawDate === 'string') {
    const d = new Date(rawDate);
    formattedDate = !isNaN(d.getTime())
      ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : rawDate;
  } else {
    formattedDate = String(rawDate ?? '');
  }

  // Position tooltip safely inside boundaries
  const tooltipWidth = 220;
  const isRightSide = hoverPos.x > width / 2;
  const tooltipLeft = isRightSide ? hoverPos.x - tooltipWidth - 16 : hoverPos.x + 16;
  const tooltipTop = Math.max(margin.top, Math.min(plotBottom - 110, hoverPos.y - 45));

  const fmtCurrency = (val: number) => {
    return `${currencySymbol}${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  return (
    <>
      {/* Vertical Crosshair Line */}
      {showCrosshair && (
        <line
          x1={hoverPos.x}
          y1={plotTop}
          x2={hoverPos.x}
          y2={plotBottom}
          stroke={indicatorColor}
          strokeDasharray="4,4"
          strokeWidth={1.5}
          strokeOpacity={0.7}
        />
      )}

      {/* Date Pill at bottom axis anchor */}
      {showDatePill && (
        <g transform={`translate(${hoverPos.x}, ${plotBottom + 12})`}>
          <rect
            x={-36}
            y={-10}
            width={72}
            height={20}
            rx={10}
            fill="var(--chart-marker-badge-background, #0f172a)"
            className="dark:fill-white shadow-xs"
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fill="var(--chart-marker-badge-foreground, #ffffff)"
            className="text-[9px] font-semibold dark:fill-slate-950 select-none"
          >
            {formattedDate.split(',')[0]}
          </text>
        </g>
      )}

      {/* HTML Overlay Floating Tooltip Card */}
      <foreignObject
        x={0}
        y={0}
        width={width}
        height={height}
        className="pointer-events-none overflow-visible"
      >
        <div
          style={{
            transform: `translate3d(${tooltipLeft}px, ${tooltipTop}px, 0)`,
            width: `${tooltipWidth}px`
          }}
          className="pointer-events-none absolute z-50 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-2xl transition-transform duration-75 ease-out dark:border-white/15 dark:bg-[#18181B]/95 dark:shadow-[0_16px_36px_rgba(0,0,0,0.6)]"
        >
          {content ? (
            content({ activePoint, index: activePointIndex })
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 dark:border-white/10">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {formattedDate}
                </span>
                {activePoint.orderCount && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-[#5B75F8] dark:text-[#7B92FF]">
                    {activePoint.orderCount} POs
                  </span>
                )}
              </div>

              <div className="space-y-1.5 pt-0.5">
                {Array.from(series.entries()).map(([key, meta]) => {
                  const val = activePoint[key];
                  if (typeof val !== 'number') return null;
                  const label = key.charAt(0).toUpperCase() + key.slice(1);

                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: meta.stroke }}
                        />
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {label}
                        </span>
                      </div>
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                        {fmtCurrency(val)}
                      </span>
                    </div>
                  );
                })}

                {/* Profit/Margin percentage if revenue and costs both exist */}
                {typeof activePoint.revenue === 'number' && typeof activePoint.costs === 'number' && (
                  <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-[11px] dark:border-white/10">
                    <span className="font-medium text-slate-400 dark:text-slate-400">Gross Margin</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.max(0, Math.round(((activePoint.revenue - activePoint.costs) / (activePoint.revenue || 1)) * 100))}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </foreignObject>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Stub helpers for compatibility with docs demo
───────────────────────────────────────────────────────────────────────────── */
export const PatternLines: React.FC<any> = () => null;
export const PatternArea: React.FC<any> = () => null;
export const ChartBrush: React.FC<any> = () => null;
export const ChartBrushLayout: React.FC<any> = ({ children }) => <>{children}</>;
