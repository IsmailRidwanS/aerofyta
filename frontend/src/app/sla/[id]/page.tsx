"use client";

import { useParams } from "next/navigation";
import AnalysisReport from "@/components/sla/AnalysisReport";
import { SLA_STATUS_MAP } from "@/lib/constants";

// Demo SLA detail with full analysis report
const demoSLA = {
  id: 1,
  clientAgent: "globex-buyer.init",
  providerAgent: "acme-analyst.init",
  serviceType: "data-analysis",
  payment: "30",
  slashPenalty: "15",
  status: 3,
  deadline: "2026-03-30 14:00 UTC",
  createdAt: "2026-03-30 13:00 UTC",
  settledAt: "2026-03-30 13:42 UTC",
  providerPayout: "29.85",
  platformFee: "0.15",
  outputHash: "0x9c1d4f2a8b3e7c6d5a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8",
  inputSpecHash: "0xa1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
};

const demoReport = {
  pool_rankings: [
    { pool: "INIT/USDC", apy: 14.2, tvl: 45000, risk_score: 72, sharpe_ratio: 1.8, il_estimate: "2.1%", allocation_pct: 35, confidence: 88 },
    { pool: "INIT/ETH", apy: 18.1, tvl: 12000, risk_score: 58, sharpe_ratio: 1.4, il_estimate: "4.7%", allocation_pct: 25, confidence: 74 },
    { pool: "milkINIT", apy: 22.3, tvl: 890000, risk_score: 85, sharpe_ratio: 2.1, il_estimate: "0%", allocation_pct: 40, confidence: 82 },
  ],
  risk_warnings: [
    "INIT/ETH pool TVL is $12K — high concentration risk above 20% allocation",
    "INIT/ETH has elevated impermanent loss (4.7%) due to ETH volatility correlation",
  ],
  summary: "Recommend 3-pool diversified allocation targeting 18.5% blended APY with moderate risk profile. milkINIT liquid staking provides the highest risk-adjusted return.",
  blended_apy: 18.5,
};

export default function SLADetailPage() {
  const params = useParams();
  const slaId = params.id;
  const statusInfo = SLA_STATUS_MAP[demoSLA.status];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">SLA #{slaId}</h1>
            <span className={`badge ${demoSLA.status === 3 ? "badge-active" : "badge-danger"}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            <span className="text-indigo-400">{demoSLA.clientAgent}</span>
            {" "}&rarr;{" "}
            <span className="text-purple-400">{demoSLA.providerAgent}</span>
          </p>
        </div>
      </div>

      {/* SLA Terms */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Agreement Terms</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase">Service</p>
            <p className="text-sm text-white capitalize mt-1">{demoSLA.serviceType.replace("-", " ")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Payment</p>
            <p className="text-sm text-white font-mono mt-1">{demoSLA.payment} INIT</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Slash Penalty</p>
            <p className="text-sm text-red-400 font-mono mt-1">{demoSLA.slashPenalty} INIT</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Deadline</p>
            <p className="text-sm text-white mt-1">{demoSLA.deadline}</p>
          </div>
        </div>
      </div>

      {/* SLA Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
        <div className="space-y-4">
          <TimelineItem
            time={demoSLA.createdAt}
            action="SLA Created"
            description={`${demoSLA.clientAgent} escrowed ${demoSLA.payment} INIT`}
            color="blue"
          />
          <TimelineItem
            time="2026-03-30 13:01 UTC"
            action="Accepted"
            description={`${demoSLA.providerAgent} accepted. Ghost Wallet auto-signed.`}
            color="blue"
          />
          <TimelineItem
            time="2026-03-30 13:38 UTC"
            action="Delivered"
            description="Analysis report produced via Claude Sonnet 4. Output hash recorded on-chain."
            color="purple"
          />
          <TimelineItem
            time={demoSLA.settledAt}
            action="Settled"
            description={`Provider paid ${demoSLA.providerPayout} INIT. Platform fee: ${demoSLA.platformFee} INIT.`}
            color="green"
          />
        </div>
      </div>

      {/* AI Analysis Report */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">AI Analysis Output</h2>
        <AnalysisReport
          report={demoReport}
          modelId="claude-sonnet-4"
          modelVersion="20250514"
          dataTimestamp={Math.floor(Date.now() / 1000) - 1800}
          dataPoints={42}
          outputHash={demoSLA.outputHash}
        />
      </div>

      {/* Audit Trail */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Audit Trail (On-Chain Events)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-2 px-3 text-slate-500 text-xs">Action</th>
                <th className="text-left py-2 px-3 text-slate-500 text-xs">Agent</th>
                <th className="text-left py-2 px-3 text-slate-500 text-xs">Model</th>
                <th className="text-left py-2 px-3 text-slate-500 text-xs">Output Hash</th>
                <th className="text-left py-2 px-3 text-slate-500 text-xs">Block</th>
              </tr>
            </thead>
            <tbody>
              <AuditRow action="CREATE" agent={demoSLA.clientAgent} model="-" hash="-" block="158920" color="text-yellow-400" />
              <AuditRow action="ACCEPT" agent={demoSLA.providerAgent} model="-" hash="-" block="158921" color="text-blue-400" />
              <AuditRow action="DELIVER" agent={demoSLA.providerAgent} model="claude-sonnet-4 (v20250514)" hash={demoSLA.outputHash.slice(0, 18) + "..."} block="158922" color="text-purple-400" />
              <AuditRow action="SETTLE" agent={demoSLA.clientAgent} model="-" hash="-" block="158923" color="text-green-400" />
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          All entries are immutable on-chain events from SLAEngine contract on aerofyta-1.
          Addresses EU AI Act Article 12 record-keeping requirements.
        </p>
      </div>
    </div>
  );
}

function TimelineItem({ time, action, description, color }: { time: string; action: string; description: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colorMap[color]}`} />
        <div className="w-0.5 flex-1 bg-[#1e293b]" />
      </div>
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{action}</span>
          <span className="text-xs text-slate-500">{time}</span>
        </div>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function AuditRow({ action, agent, model, hash, block, color }: { action: string; agent: string; model: string; hash: string; block: string; color: string }) {
  return (
    <tr className="border-b border-[#1e293b]/50 hover:bg-[#1f2937]/30">
      <td className={`py-2 px-3 font-medium ${color}`}>{action}</td>
      <td className="py-2 px-3 text-indigo-400 font-mono text-xs">{agent}</td>
      <td className="py-2 px-3 text-slate-400 font-mono text-xs">{model}</td>
      <td className="py-2 px-3 text-slate-500 font-mono text-xs">{hash}</td>
      <td className="py-2 px-3 text-slate-500 font-mono text-xs">{block}</td>
    </tr>
  );
}
