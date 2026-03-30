"use client";

import { useState } from "react";
import { CHAIN_CONFIG } from "@/lib/constants";

interface FeedItem {
  id: string;
  type: "sla_created" | "sla_delivered" | "sla_settled" | "sla_breached" | "agent_registered" | "stake_slashed";
  agentName: string;
  description: string;
  timestamp: number;
  txHash?: string;
  amount?: string;
}

function getDemoFeedItems(): FeedItem[] {
  const now = Date.now();
  return [
    {
      id: "1",
      type: "agent_registered",
      agentName: "acme-analyst.init",
      description: "Registered as Data Analysis provider | Staked 200 INIT",
      timestamp: now - 300000,
      amount: "200 INIT",
    },
    {
      id: "2",
      type: "sla_created",
      agentName: "globex-buyer.init",
      description: "Created SLA #1 | Data Analysis | Payment: 30 INIT | Deadline: 1h",
      timestamp: now - 240000,
      amount: "30 INIT",
    },
    {
      id: "3",
      type: "sla_delivered",
      agentName: "acme-analyst.init",
      description: "Delivered SLA #1 | Model: Claude Sonnet 4 | Output hash: 0x9c1d...",
      timestamp: now - 180000,
    },
    {
      id: "4",
      type: "sla_settled",
      agentName: "globex-buyer.init",
      description: "Settled SLA #1 | Provider paid: 29.85 INIT | Fee: 0.15 INIT",
      timestamp: now - 120000,
      amount: "29.85 INIT",
    },
    {
      id: "5",
      type: "sla_breached",
      agentName: "acme-analyst.init",
      description: "SLA #2 Breached | Deadline missed | Slashed: 15 INIT",
      timestamp: now - 60000,
      amount: "15 INIT",
    },
  ];
}

const typeConfig: Record<string, { gradient: string; glow: string; label: string; icon: string }> = {
  agent_registered: {
    gradient: "from-blue-500 to-indigo-500",
    glow: "rgba(99,102,241,0.3)",
    label: "REGISTERED",
    icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766z",
  },
  sla_created: {
    gradient: "from-amber-500 to-orange-500",
    glow: "rgba(245,158,11,0.3)",
    label: "SLA CREATED",
    icon: "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  sla_delivered: {
    gradient: "from-violet-500 to-purple-500",
    glow: "rgba(139,92,246,0.3)",
    label: "DELIVERED",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  sla_settled: {
    gradient: "from-emerald-500 to-green-500",
    glow: "rgba(16,185,129,0.3)",
    label: "SETTLED",
    icon: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
  },
  sla_breached: {
    gradient: "from-red-500 to-rose-500",
    glow: "rgba(239,68,68,0.3)",
    label: "BREACHED",
    icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
  },
  stake_slashed: {
    gradient: "from-red-500 to-rose-500",
    glow: "rgba(239,68,68,0.3)",
    label: "SLASHED",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z",
  },
};

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function LiveFeed() {
  const [items] = useState<FeedItem[]>(() => getDemoFeedItems());

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Live Activity</h2>
            <p className="text-[11px] text-slate-500">On-chain events stream</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
          <div className="w-[5px] h-[5px] rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium">Real-time</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {items.map((item) => {
          const config = typeConfig[item.type];
          return (
            <div
              key={item.id}
              className="feed-item group flex items-start gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.02]"
              style={{ border: '1px solid rgba(99,102,241,0.04)' }}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}
                style={{ boxShadow: `0 2px 8px -2px ${config.glow}` }}>
                <svg className="w-3.5 h-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{
                      background: `linear-gradient(135deg, ${config.glow.replace('0.3', '0.08')}, transparent)`,
                      border: `1px solid ${config.glow.replace('0.3', '0.12')}`,
                      color: config.glow.replace('0.3)', '1)'),
                    }}>
                    {config.label}
                  </span>
                  <span className="text-[11px] text-indigo-400 font-mono font-medium">{item.agentName}</span>
                </div>
                <p className="text-[12px] text-slate-400 truncate leading-relaxed">{item.description}</p>
                {item.txHash && (
                  <a
                    href={`${CHAIN_CONFIG.explorerUrl}/tx/${item.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400/70 hover:text-indigo-400 mt-1 inline-flex items-center gap-1 transition-colors"
                  >
                    View on Explorer
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Timestamp + Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] text-slate-600">{formatTimestamp(item.timestamp)}</p>
                {item.amount && (
                  <p className="text-[11px] font-mono text-slate-400 mt-1 font-medium">{item.amount}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
