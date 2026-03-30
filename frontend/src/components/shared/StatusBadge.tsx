"use client";

type BadgeVariant = "active" | "pending" | "danger" | "info" | "warning" | "settled" | "breached";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  pulse?: boolean;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  settled: "bg-green-500/10 text-green-400 border-green-500/20",
  breached: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function StatusBadge({
  variant,
  label,
  pulse = false,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {pulse && (
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
          variant === "active" ? "bg-green-500" :
          variant === "danger" || variant === "breached" ? "bg-red-500" :
          variant === "pending" ? "bg-yellow-500" :
          "bg-blue-500"
        }`} />
      )}
      {label}
    </span>
  );
}
