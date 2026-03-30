"use client";

import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import AnimatedNumber from "@/components/shared/AnimatedNumber";

const slaTimelineData = [
  { day: "Day 1", created: 0, settled: 0, breached: 0 },
  { day: "Day 2", created: 1, settled: 0, breached: 0 },
  { day: "Day 3", created: 1, settled: 1, breached: 0 },
  { day: "Day 4", created: 2, settled: 1, breached: 0 },
  { day: "Day 5", created: 2, settled: 1, breached: 1 },
];

const revenuePieData = [
  { name: "Registration", value: 50, color: "#22d3ee" },
  { name: "Slash", value: 3, color: "#f87171" },
  { name: "Fees", value: 0.15, color: "#818cf8" },
];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[11px]" style={{
      background: 'rgba(15,16,41,0.95)', border: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(10px)',
    }}>
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-mono">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const metrics = {
    totalAgents: 2,
    activeAgents: 2,
    totalSLAs: 2,
    settledSLAs: 1,
    breachedSLAs: 1,
    totalStaked: "300",
    totalVolume: "60",
    feeRevenue: "0.15",
    slashRevenue: "3.00",
    registrationRevenue: "50.00",
    totalRevenue: "53.15",
    sequencerGas: "0.02",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Protocol <span className="gradient-text">Analytics</span>
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Real-time metrics from on-chain data across aerofyta-1
        </p>
      </div>

      {/* Revenue Overview */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(16,185,129,0.15)' }}>
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-white">Revenue Breakdown</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <MetricCard
            label="Platform Fees (0.5%)"
            value={metrics.feeRevenue}
            unit="INIT"
            subtext="From SLA settlements"
            gradient="from-indigo-500 to-violet-500"
            glow="rgba(99,102,241,0.15)"
          />
          <MetricCard
            label="Slash Revenue (20%)"
            value={metrics.slashRevenue}
            unit="INIT"
            subtext="From SLA breaches"
            gradient="from-red-500 to-rose-500"
            glow="rgba(239,68,68,0.15)"
          />
          <MetricCard
            label="Registration Fees"
            value={metrics.registrationRevenue}
            unit="INIT"
            subtext="25 INIT per agent"
            gradient="from-cyan-500 to-blue-500"
            glow="rgba(6,182,212,0.15)"
          />
          <MetricCard
            label="Total Protocol Revenue"
            value={metrics.totalRevenue}
            unit="INIT"
            subtext="All streams combined"
            gradient="from-emerald-500 to-cyan-500"
            glow="rgba(16,185,129,0.2)"
            highlight
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SLA Timeline Chart */}
        <div className="card">
          <h3 className="text-[14px] font-semibold text-white mb-4">SLA Activity Over Time</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaTimelineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="settledGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="created" name="Created" stroke="#818cf8" strokeWidth={2} fill="url(#createdGrad)" dot={false} />
                <Area type="monotone" dataKey="settled" name="Settled" stroke="#4ade80" strokeWidth={2} fill="url(#settledGrad)" dot={false} />
                <Area type="monotone" dataKey="breached" name="Breached" stroke="#f87171" strokeWidth={2} fill="none" dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-indigo-400 rounded" /><span className="text-[10px] text-slate-500">Created</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-emerald-400 rounded" /><span className="text-[10px] text-slate-500">Settled</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-red-400 rounded border-dashed" /><span className="text-[10px] text-slate-500">Breached</span></div>
          </div>
        </div>

        {/* Revenue Pie Chart */}
        <div className="card">
          <h3 className="text-[14px] font-semibold text-white mb-4">Revenue Sources</h3>
          <div className="flex items-center justify-center gap-6">
            <div className="w-[140px] h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenuePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {revenuePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {revenuePieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                  <div>
                    <p className="text-[12px] text-white font-medium">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{item.value} INIT</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Metrics */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-white">Agent Metrics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard
            label="Total Agents"
            value={metrics.totalAgents.toString()}
            unit=""
            subtext={`${metrics.activeAgents} active`}
            gradient="from-indigo-500 to-violet-500"
            glow="rgba(99,102,241,0.15)"
          />
          <MetricCard
            label="Total Staked"
            value={metrics.totalStaked}
            unit="INIT"
            subtext="Performance bonds"
            gradient="from-violet-500 to-purple-500"
            glow="rgba(139,92,246,0.15)"
          />
          <MetricCard
            label="Total Volume"
            value={metrics.totalVolume}
            unit="INIT"
            subtext="SLA payment volume"
            gradient="from-cyan-500 to-blue-500"
            glow="rgba(6,182,212,0.15)"
          />
        </div>
      </div>

      {/* SLA Metrics */}
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h2 className="text-[15px] font-semibold text-white">SLA Metrics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard
            label="Total SLAs"
            value={metrics.totalSLAs.toString()}
            unit=""
            subtext="All time"
            gradient="from-indigo-500 to-violet-500"
            glow="rgba(99,102,241,0.15)"
          />
          <MetricCard
            label="Settled"
            value={metrics.settledSLAs.toString()}
            unit=""
            subtext={`${Math.round((metrics.settledSLAs / metrics.totalSLAs) * 100)}% success rate`}
            gradient="from-emerald-500 to-green-500"
            glow="rgba(16,185,129,0.15)"
          />
          <MetricCard
            label="Breached"
            value={metrics.breachedSLAs.toString()}
            unit=""
            subtext={`${Math.round((metrics.breachedSLAs / metrics.totalSLAs) * 100)}% breach rate`}
            gradient="from-red-500 to-rose-500"
            glow="rgba(239,68,68,0.15)"
          />
        </div>
      </div>

      {/* Audit Trail Summary */}
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
            <p className="text-[11px] text-slate-500">Every AI decision recorded immutably on-chain. EU AI Act Article 12 compliant.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(99,102,241,0.04)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.02)' }}>
                {["Agent", "SLA", "Action", "Model", "Output Hash", "Block"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { agent: "globex-buyer.init", sla: "#1", action: "CREATE", model: "-", hash: "-", block: "158920", color: "text-amber-400" },
                { agent: "acme-analyst.init", sla: "#1", action: "ACCEPT", model: "-", hash: "-", block: "158921", color: "text-blue-400" },
                { agent: "acme-analyst.init", sla: "#1", action: "DELIVER", model: "claude-sonnet-4", hash: "0x9c1d...", block: "158922", color: "text-violet-400" },
                { agent: "globex-buyer.init", sla: "#1", action: "SETTLE", model: "-", hash: "-", block: "158923", color: "text-emerald-400" },
                { agent: "acme-analyst.init", sla: "#2", action: "BREACH", model: "-", hash: "-", block: "158950", color: "text-red-400" },
              ].map((row, i) => (
                <tr key={i} className="transition-all hover:bg-white/[0.01]"
                  style={{ borderTop: '1px solid rgba(99,102,241,0.03)' }}>
                  <td className="py-2.5 px-4 text-indigo-400 font-mono text-[11px]">{row.agent}</td>
                  <td className="py-2.5 px-4 text-slate-300">{row.sla}</td>
                  <td className={`py-2.5 px-4 font-semibold ${row.color}`}>{row.action}</td>
                  <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">{row.model}</td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{row.hash}</td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{row.block}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  subtext,
  gradient,
  glow,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  subtext: string;
  gradient: string;
  glow: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card !p-4 group relative ${highlight ? 'pulse-glow' : ''}`}>
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: `0 0 30px -10px ${glow}` }} />
      <div className="relative z-10">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}
          style={{ boxShadow: `0 3px 10px -3px ${glow}` }}>
          <span className="text-[10px] font-bold text-white/80">{label.slice(0, 2).toUpperCase()}</span>
        </div>
        <p className={`stat-number !text-2xl ${highlight ? 'gradient-text' : 'text-white'}`}>
          {value} {unit && <span className="text-[13px] text-slate-400 font-normal">{unit}</span>}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">{subtext}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
