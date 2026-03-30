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
  { id: 1, client: "globex-buyer.init", service: "data-analysis", payment: "30", status: "Settled", isGood: true, date: "2026-03-30 13:42" },
  { id: 2, client: "globex-buyer.init", service: "data-analysis", payment: "30", status: "Breached", isGood: false, date: "2026-03-30 14:30" },
];

export default function AgentDetailPage() {
  const params = useParams();
  const _agentId = params.id; // Used for on-chain queries when deployed
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
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"
            style={{ boxShadow: '0 8px 25px -5px rgba(99,102,241,0.4)' }}>
            <svg className="w-7 h-7 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {demoAgent.initUsername}<span className="text-indigo-400">.init</span>
            </h1>
            <p className="text-[13px] text-slate-500 capitalize">{demoAgent.serviceType.replace("-", " ")} Provider</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
          style={demoAgent.isActive ? {
            background: 'rgba(34,197,94,0.08)',
            color: '#4ade80',
            border: '1px solid rgba(34,197,94,0.12)',
            boxShadow: '0 0 12px -3px rgba(34,197,94,0.2)',
          } : {
            background: 'rgba(239,68,68,0.08)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.12)',
          }}>
          <div className={`w-[5px] h-[5px] rounded-full ${demoAgent.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {demoAgent.isActive ? "Active" : "Paused"}
        </span>
      </div>

      {/* Description */}
      <div className="card-glass !p-4">
        <p className="text-[13px] text-slate-300 leading-relaxed">{demoAgent.description}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Staked", value: `${demoAgent.stake}`, unit: "INIT", gradient: "from-indigo-500 to-violet-500", glow: "rgba(99,102,241,0.15)" },
          { label: "Earnings", value: `${demoAgent.earnings}`, unit: "INIT", gradient: "from-emerald-500 to-green-500", glow: "rgba(16,185,129,0.15)" },
          { label: "Performance", value: `${performanceScore}%`, unit: `${demoAgent.completedSLAs}/${demoAgent.totalSLAs}`, gradient: performanceScore >= 80 ? "from-emerald-500 to-cyan-500" : "from-amber-500 to-orange-500", glow: "rgba(6,182,212,0.15)" },
          { label: "Active SLAs", value: demoAgent.activeSLAs.toString(), unit: "In Progress", gradient: "from-cyan-500 to-blue-500", glow: "rgba(6,182,212,0.15)" },
        ].map((stat) => (
          <div key={stat.label} className="card !p-4 group relative">
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ boxShadow: `0 0 30px -10px ${stat.glow}` }} />
            <div className="relative z-10">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3`}
                style={{ boxShadow: `0 3px 10px -3px ${stat.glow}` }}>
                <span className="text-[10px] font-bold text-white/80">{stat.label.slice(0, 2).toUpperCase()}</span>
              </div>
              <p className="stat-number !text-2xl text-white">{stat.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{stat.unit}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ghost Wallet Session */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Ghost Wallet Session</h2>
            <p className="text-[11px] text-slate-500">Auto-signing via Initia AuthZ + FeeGrant</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Ghost Wallet", value: demoAgent.ghostWallet, isMono: true, truncate: true },
            { label: "Session Expires In", value: `${sessionHours}h ${sessionMinutes}m`, extra: new Date(demoAgent.sessionExpiry * 1000).toLocaleString() },
            { label: "Max Per Transaction", value: `${demoAgent.maxPerTx} INIT` },
          ].map((item) => (
            <div key={item.label} className="p-3.5 rounded-xl"
              style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)' }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{item.label}</p>
              <p className={`text-[13px] text-white mt-1.5 ${item.isMono ? 'font-mono text-[11px]' : ''} ${item.truncate ? 'truncate' : ''}`}
                title={item.truncate ? item.value : undefined}>
                {item.value}
              </p>
              {item.extra && (
                <p className="text-[10px] text-slate-600 mt-0.5">{item.extra}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-600 mt-3">
          Permissions enforced at Initia chain consensus via AuthZ. Agent cannot exceed these boundaries.
        </p>
      </div>

      {/* Actions */}
      <div className="card">
        <h2 className="text-[15px] font-semibold text-white mb-4">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Pause Agent", color: "amber", icon: "M15.75 5.25v13.5m-7.5-13.5v13.5" },
            { label: "Add Stake", color: "indigo", icon: "M12 4.5v15m7.5-7.5h-15" },
            { label: "Withdraw Earnings", color: "emerald", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75" },
            { label: "Revoke Session", color: "slate", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
            { label: "Deregister", color: "red", icon: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" },
          ].map((action) => {
            const colorStyles: Record<string, { bg: string; text: string; border: string; hoverBg: string }> = {
              amber: { bg: 'rgba(245,158,11,0.06)', text: '#fbbf24', border: 'rgba(245,158,11,0.1)', hoverBg: 'rgba(245,158,11,0.1)' },
              indigo: { bg: 'rgba(99,102,241,0.06)', text: '#a5b4fc', border: 'rgba(99,102,241,0.1)', hoverBg: 'rgba(99,102,241,0.1)' },
              emerald: { bg: 'rgba(16,185,129,0.06)', text: '#6ee7b7', border: 'rgba(16,185,129,0.1)', hoverBg: 'rgba(16,185,129,0.1)' },
              slate: { bg: 'rgba(148,163,184,0.04)', text: '#94a3b8', border: 'rgba(148,163,184,0.08)', hoverBg: 'rgba(148,163,184,0.08)' },
              red: { bg: 'rgba(239,68,68,0.06)', text: '#fca5a5', border: 'rgba(239,68,68,0.1)', hoverBg: 'rgba(239,68,68,0.1)' },
            };
            const cs = colorStyles[action.color];
            return (
              <button key={action.label}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all hover:scale-[1.02]"
                style={{ background: cs.bg, color: cs.text, border: `1px solid ${cs.border}` }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                </svg>
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SLA History */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-white">SLA History</h2>
        </div>
        <div className="space-y-2">
          {slaHistory.map((sla) => (
            <Link
              key={sla.id}
              href={`/sla/${sla.id}`}
              className="flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-white/[0.02] group"
              style={{ border: '1px solid rgba(99,102,241,0.04)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-white font-semibold">SLA #{sla.id}</span>
                <span className="text-[11px] text-indigo-400 font-mono">{sla.client}</span>
                <span className="text-[11px] text-slate-600 capitalize">{sla.service.replace("-", " ")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-mono text-slate-300">{sla.payment} INIT</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                  style={sla.isGood ? {
                    background: 'rgba(34,197,94,0.08)',
                    color: '#4ade80',
                    border: '1px solid rgba(34,197,94,0.1)',
                  } : {
                    background: 'rgba(239,68,68,0.08)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.1)',
                  }}>
                  {sla.status}
                </span>
                <span className="text-[10px] text-slate-600">{sla.date}</span>
                <svg className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
