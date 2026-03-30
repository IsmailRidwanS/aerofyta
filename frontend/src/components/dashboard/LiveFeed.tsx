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

// Demo feed items — in production these come from WebSocket/on-chain events
const demoFeedItems: FeedItem[] = [
  {
    id: "1",
    type: "agent_registered",
    agentName: "acme-analyst.init",
    description: "Registered as Data Analysis provider | Staked 200 INIT",
    timestamp: Date.now() - 300000,
    amount: "200 INIT",
  },
  {
    id: "2",
    type: "sla_created",
    agentName: "globex-buyer.init",
    description: "Created SLA #1 | Data Analysis | Payment: 30 INIT | Deadline: 1h",
    timestamp: Date.now() - 240000,
    amount: "30 INIT",
  },
  {
    id: "3",
    type: "sla_delivered",
    agentName: "acme-analyst.init",
    description: "Delivered SLA #1 | Model: Claude Sonnet 4 | Output hash: 0x9c1d...",
    timestamp: Date.now() - 180000,
  },
  {
    id: "4",
    type: "sla_settled",
    agentName: "globex-buyer.init",
    description: "Settled SLA #1 | Provider paid: 29.85 INIT | Fee: 0.15 INIT",
    timestamp: Date.now() - 120000,
    amount: "29.85 INIT",
  },
  {
    id: "5",
    type: "sla_breached",
    agentName: "acme-analyst.init",
    description: "SLA #2 Breached | Deadline missed | Slashed: 15 INIT",
    timestamp: Date.now() - 60000,
    amount: "15 INIT",
  },
];

const typeConfig: Record<string, { color: string; label: string }> = {
  agent_registered: { color: "bg-blue-500", label: "REGISTERED" },
  sla_created: { color: "bg-yellow-500", label: "SLA CREATED" },
  sla_delivered: { color: "bg-purple-500", label: "DELIVERED" },
  sla_settled: { color: "bg-green-500", label: "SETTLED" },
  sla_breached: { color: "bg-red-500", label: "BREACHED" },
  stake_slashed: { color: "bg-red-500", label: "SLASHED" },
};

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function LiveFeed() {
  const [items] = useState<FeedItem[]>(demoFeedItems);

  // TODO: Replace with WebSocket subscription to on-chain events

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Live Activity Feed</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-slate-400">Real-time</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {items.map((item) => {
          const config = typeConfig[item.type];
          return (
            <div
              key={item.id}
              className="feed-item flex items-start gap-3 p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b] hover:border-[#374151] transition-all"
            >
              {/* Status dot */}
              <div className={`w-2 h-2 rounded-full mt-2 ${config.color}`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#1f2937] text-slate-300">
                    {config.label}
                  </span>
                  <span className="text-xs text-indigo-400 font-mono">{item.agentName}</span>
                </div>
                <p className="text-sm text-slate-300 truncate">{item.description}</p>
                {item.txHash && (
                  <a
                    href={`${CHAIN_CONFIG.explorerUrl}/tx/${item.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
                  >
                    View on Explorer &rarr;
                  </a>
                )}
              </div>

              {/* Timestamp + Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500">{formatTimestamp(item.timestamp)}</p>
                {item.amount && (
                  <p className="text-xs font-mono text-slate-400 mt-1">{item.amount}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
