"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  filled?: boolean;
  className?: string;
}

export default function Sparkline({
  data,
  width = 60,
  height = 20,
  color = "#6366f1",
  filled = true,
  className = "",
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  const lastPoint = data[data.length - 1];
  const lastX = width - padding;
  const lastY = height - padding - ((lastPoint - min) / range) * (height - padding * 2);

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      {filled && (
        <defs>
          <linearGradient id={`sparkfill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {filled && (
        <polygon
          points={fillPoints}
          fill={`url(#sparkfill-${color.replace('#', '')})`}
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  );
}
