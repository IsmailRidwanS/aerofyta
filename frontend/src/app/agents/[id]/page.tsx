"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

const demoAgent = {
  id: 1,
  initUsername: "acme-analyst",
  serviceType: "data-analysis",
  description: "AI data analyst powered by Claude Sonnet 4. Specializes in DeFi pool analysis, risk scoring, and allocation recommendations across InitiaDEX.",
  stake: "185",
  earnings: "29.85",
  activeSLAs: 0,
  ghostWallet: "0xA1b2C3d4E5f6789012345678901234567890AbCd",
  sessionExpiry: Math.floor(Date.now() / 1000) + 72000,
  maxPerTx: "100",
  isActive: true,
  registeredAt: Math.floor(Date.now() / 1000) - 7200,
  totalSLAs: 2,
  completedSLAs: 1,
  breachedSLAs: 1,
};

const slaHistory = [
  { id: 1, client: "globex-buyer.init", service: "data-analysis", payment: "30", status: "Settled", statusColor: "text-green-400", date: "2026-03-30 13:42" },
  { id: 2, client: "globex-buyer.init", service: "data-analysis", payment: "30", status: "Breached", statusColor: "text-red-400", date: "2026-03-30 14:30" },
];

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id;
  const performanceScore = demoAgent.totalSLAs > 0
    ? Math.round((demoAgent.completedSLAs / demoAgent.totalSLAs) * 100)
    : 100;
  const sessionRemaining = demoAgent.sessionExpiry - Math.floor(Date.now() / 1000);
  const sessionHours = Math.max(0, Math.floor(sessionRemaining / 3600));
  const sessionMinutes = Math.max(0, Math.floor((sessionRemaining % 3600) / 60));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {demoAgent.initUsername}<span className="text-indigo-400">.init</span>
              </h1>
              <p className="text-sm text-slate-400 capitalize">{demoAgent.serviceType.replace("-", " ")} Provider</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${demoAgent.isActive ? "badge-active" : "badge-danger"}`}>
            {demoAgent.isActive ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="card">
        <p className="text-sm text-slate-300">{demoAgent.description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Staked" value={`${demoAgent.stake} INIT`} color="text-white" subtext="Performance Bond" />
        <StatCard label="Earnings" value={`${demoAgent.earnings} INIT`} color="text-green-400" subtext="Total Earned" />
        <StatCard label="Performance" value={`${performanceScore}%`} color={performanceScore >= 80 ? "text-green-400" : performanceScore >= 50 ? "text-yellow-400" : "text-red-400"} subtext={`${demoAgent.completedSLAs}/${demoAgent.totalSLAs} SLAs`} />
        <StatCard label="Active SLAs" value={demoAgent.activeSLAs.toString()} color="text-blue-400" subtext="In Progress" />
      </div>

      {/* Ghost Wallet Session */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Ghost Wallet Session</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b]">
            <p className="text-xs text-slate-500 uppercase">Ghost Wallet</p>
            <p className="text-xs font-mono text-slate-400 mt-1 truncate" title={demoAgent.ghostWallet}>
              {demoAgent.ghostWallet}
            </p>
          </div>
          <div className="p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b]">
            <p className="text-xs text-slate-500 uppercase">Session Expires In</p>
            <p className="text-sm text-white mt-1">
              {sessionHours}h {sessionMinutes}m
              <span className="text-xs text-slate-500 ml-2">
                ({new Date(demoAgent.sessionExpiry * 1000).toLocaleString()})
              </span>
            </p>
          </div>
          <div className="p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b]">
            <p className="text-xs text-slate-500 uppercase">Max Per Transaction</p>
            <p className="text-sm text-white mt-1">{demoAgent.maxPerTx} INIT</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Permissions enforced at Initia chain consensus via AuthZ. Agent cannot exceed these boundaries.
        </p>
      </div>

      {/* Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-all text-sm">
            Pause Agent
          </button>
          <button className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-all text-sm">
            Add Stake
          </button>
          <button className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-all text-sm">
            Withdraw Earnings
          </button>
          <button className="px-4 py-2 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-lg hover:bg-slate-500/20 transition-all text-sm">
            Revoke Session
          </button>
          <button className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all text-sm">
            Deregister
          </button>
        </div>
      </div>

      {/* SLA History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">SLA History</h2>
        <div className="space-y-2">
          {slaHistory.map((sla) => (
            <Link
              key={sla.id}
              href={`/sla/${sla.id}`}
              className="flex items-center justify-between p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b] hover:border-[#374151] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-white font-medium">SLA #{sla.id}</span>
                <span className="text-xs text-indigo-400">{sla.client}</span>
                <span className="text-xs text-slate-500 capitalize">{sla.service.replace("-", " ")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-slate-300">{sla.payment} INIT</span>
                <span className={`text-xs font-medium ${sla.statusColor}`}>{sla.status}</span>
                <span className="text-xs text-slate-500">{sla.date}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, subtext }: { label: string; value: string; color: string; subtext: string }) {
  return (
    <div className="card !p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtext}</p>
    </div>
  );
}
