"use client";

import { CHAIN_CONFIG } from "@/lib/constants";

interface TxLinkProps {
  txHash: string;
  label?: string;
  className?: string;
}

export default function TxLink({ txHash, label, className = "" }: TxLinkProps) {
  const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;
  const explorerUrl = `${CHAIN_CONFIG.explorerUrl}/tx/${txHash}`;

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors ${className}`}
      title={txHash}
    >
      <span className="font-mono text-xs">{label || shortHash}</span>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}
