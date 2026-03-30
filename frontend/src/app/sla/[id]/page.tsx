"use client";

import { useParams } from "next/navigation";
import AnalysisReport from "@/components/sla/AnalysisReport";
import { SLA_STATUS_MAP } from "@/lib/constants";

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

const timelineSteps = [
  { time: demoSLA.createdAt, action: "SLA Created", description: `${demoSLA.clientAgent} escrowed ${demoSLA.payment} INIT`, gradient: "from-amber-500 to-orange-500", glow: "rgba(245,158,11,0.3)" },
  { time: "2026-03-30 13:01 UTC", action: "Accepted", description: `${demoSLA.providerAgent} accepted. Ghost Wallet auto-signed.`, gradient: "from-blue-500 to-indigo-500", glow: "rgba(59,130,246,0.3)" },
  { time: "2026-03-30 13:38 UTC", action: "Delivered", description: "Analysis report produced via Claude Sonnet 4. Output hash recorded on-chain.", gradient: "from-violet-500 to-purple-500", glow: "rgba(139,92,246,0.3)" },
  { time: demoSLA.settledAt, action: "Settled", description: `Provider paid ${demoSLA.providerPayout} INIT. Platform fee: ${demoSLA.platformFee} INIT.`, gradient: "from-emerald-500 to-green-500", glow: "rgba(16,185,129,0.3)" },
];

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
            <h1 className="text-2xl font-bold text-white tracking-tight">SLA #{slaId}</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={demoSLA.status === 3 ? {
                background: 'rgba(34,197,94,0.08)',
                color: '#4ade80',
                border: '1px solid rgba(34,197,94,0.12)',
                boxShadow: '0 0 12px -3px rgba(34,197,94,0.2)',
              } : {
                background: 'rgba(239,68,68,0.08)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.12)',
              }}>
              <div className={`w-[5px] h-[5px] rounded-full ${demoSLA.status === 3 ? 'bg-emerald-400' : 'bg-red-400'}`} />
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[13px] text-indigo-400 font-medium">{demoSLA.clientAgent}</span>
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            <span className="text-[13px] text-violet-400 font-medium">{demoSLA.providerAgent}</span>
          </div>
        </div>
      </div>

      {/* SLA Terms */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-white">Agreement Terms</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Service", value: demoSLA.serviceType.replace("-", " "), capitalize: true },
            { label: "Payment", value: `${demoSLA.payment} INIT`, mono: true },
            { label: "Slash Penalty", value: `${demoSLA.slashPenalty} INIT`, mono: true, color: "text-red-400" },
            { label: "Deadline", value: demoSLA.deadline },
          ].map((term) => (
            <div key={term.label} className="p-3 rounded-xl"
              style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)' }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{term.label}</p>
              <p className={`text-[13px] mt-1.5 ${term.color || 'text-white'} ${term.mono ? 'font-mono font-medium' : ''} ${term.capitalize ? 'capitalize' : ''}`}>
                {term.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SLA Timeline */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(139,92,246,0.15)' }}>
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-white">Timeline</h2>
        </div>
        <div className="space-y-0">
          {timelineSteps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${step.gradient} flex-shrink-0`}
                  style={{ boxShadow: `0 0 8px -1px ${step.glow}` }} />
                {i < timelineSteps.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: 'rgba(99,102,241,0.08)' }} />
                )}
              </div>
              <div className="pb-5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-white">{step.action}</span>
                  <span className="text-[10px] text-slate-600">{step.time}</span>
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis Report */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-white">AI Analysis Output</h2>
        </div>
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(16,185,129,0.15)' }}>
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Audit Trail</h2>
            <p className="text-[11px] text-slate-500">Immutable on-chain events</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(99,102,241,0.04)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.02)' }}>
                <th className="text-left py-2.5 px-4 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Action</th>
                <th className="text-left py-2.5 px-4 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Agent</th>
                <th className="text-left py-2.5 px-4 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Model</th>
                <th className="text-left py-2.5 px-4 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Output Hash</th>
                <th className="text-left py-2.5 px-4 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Block</th>
              </tr>
            </thead>
            <tbody>
              {[
                { action: "CREATE", agent: demoSLA.clientAgent, model: "-", hash: "-", block: "158920", color: "text-amber-400" },
                { action: "ACCEPT", agent: demoSLA.providerAgent, model: "-", hash: "-", block: "158921", color: "text-blue-400" },
                { action: "DELIVER", agent: demoSLA.providerAgent, model: "claude-sonnet-4 (v20250514)", hash: demoSLA.outputHash.slice(0, 18) + "...", block: "158922", color: "text-violet-400" },
                { action: "SETTLE", agent: demoSLA.clientAgent, model: "-", hash: "-", block: "158923", color: "text-emerald-400" },
              ].map((row, i) => (
                <tr key={i} className="transition-all hover:bg-white/[0.01]"
                  style={{ borderTop: '1px solid rgba(99,102,241,0.03)' }}>
                  <td className={`py-2.5 px-4 font-semibold ${row.color}`}>{row.action}</td>
                  <td className="py-2.5 px-4 text-indigo-400 font-mono text-[11px]">{row.agent}</td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{row.model}</td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{row.hash}</td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{row.block}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-600 mt-3">
          All entries are immutable on-chain events from SLAEngine contract on aerofyta-1.
          Addresses EU AI Act Article 12 record-keeping requirements.
        </p>
      </div>
    </div>
  );
}
