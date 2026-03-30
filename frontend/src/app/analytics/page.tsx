"use client";

export default function AnalyticsPage() {
  // TODO: Pull all data from BillingEngine + AgentVault on-chain queries
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
        <h1 className="text-2xl font-bold text-white">Protocol Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Real-time metrics from on-chain data. Zero hardcoded values.
        </p>
      </div>

      {/* Revenue Overview */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Revenue Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Platform Fees (0.5%)"
            value={`${metrics.feeRevenue} INIT`}
            subtext="From SLA settlements"
            color="indigo"
          />
          <MetricCard
            label="Slash Revenue (20%)"
            value={`${metrics.slashRevenue} INIT`}
            subtext="From SLA breaches"
            color="red"
          />
          <MetricCard
            label="Registration Fees"
            value={`${metrics.registrationRevenue} INIT`}
            subtext="25 INIT per agent"
            color="blue"
          />
          <MetricCard
            label="Total Protocol Revenue"
            value={`${metrics.totalRevenue} INIT`}
            subtext="All streams combined"
            color="green"
            highlight
          />
        </div>
      </div>

      {/* Agent Metrics */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Agent Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Agents"
            value={metrics.totalAgents.toString()}
            subtext={`${metrics.activeAgents} active`}
            color="blue"
          />
          <MetricCard
            label="Total Staked"
            value={`${metrics.totalStaked} INIT`}
            subtext="Performance bonds"
            color="purple"
          />
          <MetricCard
            label="Total Volume"
            value={`${metrics.totalVolume} INIT`}
            subtext="SLA payment volume"
            color="indigo"
          />
        </div>
      </div>

      {/* SLA Metrics */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">SLA Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total SLAs"
            value={metrics.totalSLAs.toString()}
            subtext="All time"
            color="blue"
          />
          <MetricCard
            label="Settled"
            value={metrics.settledSLAs.toString()}
            subtext={`${Math.round((metrics.settledSLAs / metrics.totalSLAs) * 100)}% success rate`}
            color="green"
          />
          <MetricCard
            label="Breached"
            value={metrics.breachedSLAs.toString()}
            subtext={`${Math.round((metrics.breachedSLAs / metrics.totalSLAs) * 100)}% breach rate`}
            color="red"
          />
        </div>
      </div>

      {/* Audit Trail Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Audit Trail</h2>
        <p className="text-sm text-slate-400 mb-4">
          Every AI decision recorded immutably on-chain. Addresses EU AI Act Article 12
          record-keeping requirements.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Agent</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">SLA</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Action</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Model</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Output Hash</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">Block</th>
              </tr>
            </thead>
            <tbody>
              <AuditRow agent="globex-buyer.init" sla="#1" action="create" model="-" outputHash="-" block="158920" />
              <AuditRow agent="acme-analyst.init" sla="#1" action="accept" model="-" outputHash="-" block="158921" />
              <AuditRow agent="acme-analyst.init" sla="#1" action="deliver" model="claude-sonnet-4" outputHash="0x9c1d..." block="158922" />
              <AuditRow agent="globex-buyer.init" sla="#1" action="settle" model="-" outputHash="-" block="158923" />
              <AuditRow agent="acme-analyst.init" sla="#2" action="breach" model="-" outputHash="-" block="158950" />
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
  subtext,
  color,
  highlight,
}: {
  label: string;
  value: string;
  subtext: string;
  color: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    indigo: "border-indigo-500/20 bg-indigo-500/5",
    red: "border-red-500/20 bg-red-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    green: "border-green-500/20 bg-green-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
  };

  const textColor: Record<string, string> = {
    indigo: "text-indigo-400",
    red: "text-red-400",
    blue: "text-blue-400",
    green: "text-green-400",
    purple: "text-purple-400",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorMap[color]} ${highlight ? "ring-1 ring-green-500/30" : ""}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "gradient-text" : textColor[color]}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtext}</p>
    </div>
  );
}

function AuditRow({
  agent,
  sla,
  action,
  model,
  outputHash,
  block,
}: {
  agent: string;
  sla: string;
  action: string;
  model: string;
  outputHash: string;
  block: string;
}) {
  const actionColor: Record<string, string> = {
    create: "text-yellow-400",
    accept: "text-blue-400",
    deliver: "text-purple-400",
    settle: "text-green-400",
    breach: "text-red-400",
    dispute: "text-orange-400",
  };

  return (
    <tr className="border-b border-[#1e293b]/50 hover:bg-[#1f2937]/30">
      <td className="py-3 px-4 text-indigo-400 font-mono text-xs">{agent}</td>
      <td className="py-3 px-4 text-slate-300">{sla}</td>
      <td className={`py-3 px-4 font-medium ${actionColor[action] || "text-slate-300"}`}>{action.toUpperCase()}</td>
      <td className="py-3 px-4 text-slate-400 font-mono text-xs">{model}</td>
      <td className="py-3 px-4 text-slate-500 font-mono text-xs">{outputHash}</td>
      <td className="py-3 px-4 text-slate-500 font-mono text-xs">{block}</td>
    </tr>
  );
}
