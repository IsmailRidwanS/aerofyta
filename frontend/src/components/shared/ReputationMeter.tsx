"use client";

import { useEffect, useState } from "react";

interface ReputationMeterProps {
  score: number; // 0-100
  size?: number;
  className?: string;
}

export default function ReputationMeter({
  score,
  size = 48,
  className = "",
}: ReputationMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;
  const offset = circumference - progress;

  const color =
    score >= 70 ? "#4ade80" :
    score >= 40 ? "#fbbf24" :
    "#f87171";

  const bgColor =
    score >= 70 ? "rgba(74,222,128,0.08)" :
    score >= 40 ? "rgba(251,191,36,0.08)" :
    "rgba(248,113,113,0.08)";

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(99,102,241,0.06)"
          strokeWidth={3}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold"
        style={{ color, fontFeatureSettings: "'tnum'" }}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}
