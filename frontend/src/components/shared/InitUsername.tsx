"use client";

interface InitUsernameProps {
  username: string;
  size?: "sm" | "md" | "lg";
  showCopy?: boolean;
  className?: string;
}

export default function InitUsername({
  username,
  size = "md",
  showCopy = false,
  className = "",
}: InitUsernameProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${username}.init`);
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono ${sizeClasses[size]} ${className}`}
      title={`${username}.init`}
    >
      <span className="text-slate-200">{username}</span>
      <span className="text-indigo-400">.init</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
          title="Copy username"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </span>
  );
}
