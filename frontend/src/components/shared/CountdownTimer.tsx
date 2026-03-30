"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  deadline: number; // Unix timestamp in seconds
  className?: string;
}

export default function CountdownTimer({ deadline, className = "" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(deadline - Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(deadline - Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (remaining <= 0) {
    return <span className={`text-red-400 font-mono text-[12px] font-semibold ${className}`}>EXPIRED</span>;
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const isWarning = remaining < 1800; // < 30 minutes
  const isCritical = remaining < 300;  // < 5 minutes

  const color = isCritical
    ? "text-red-400"
    : isWarning
    ? "text-amber-400"
    : "text-slate-300";

  return (
    <span
      className={`font-mono text-[12px] font-medium ${color} ${isCritical ? "animate-pulse" : ""} ${className}`}
      style={{ fontFeatureSettings: "'tnum'" }}
    >
      {hours.toString().padStart(2, "0")}:{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}
