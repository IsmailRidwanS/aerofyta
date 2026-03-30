"use client";

interface PoolRanking {
  pool: string;
  apy: number;
  tvl: number;
  risk_score: number;
  sharpe_ratio: number;
  il_estimate: string;
  allocation_pct: number;
  confidence: number;
}

interface AnalysisReportData {
  pool_rankings: PoolRanking[];
  risk_warnings: string[];
  summary: string;
  blended_apy: number;
}

interface AnalysisReportProps {
  report: AnalysisReportData;
  modelId: string;
  modelVersion: string;
  dataTimestamp: number;
  dataPoints: number;
  outputHash: string;
}

export default function AnalysisReport({
  report,
  modelId,
  modelVersion,
  dataTimestamp,
  dataPoints,
  outputHash,
}: AnalysisReportProps) {
  return (
    <div className="card relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(15,16,41,0.95), rgba(99,102,241,0.03), rgba(15,16,41,0.8))',
        border: '1px solid rgba(99,102,241,0.12)',
      }}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 80% 0%, rgba(99,102,241,0.08), transparent)',
        }} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"
              style={{ boxShadow: '0 4px 15px -3px rgba(99,102,241,0.4)' }}>
              <svg className="w-5 h-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">AI Analysis Report</h3>
              <p className="text-[11px] text-slate-500">
                {modelId} (v{modelVersion}) | {dataPoints} data points
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="stat-number !text-2xl gradient-text">{report.blended_apy}%</p>
            <p className="text-[10px] text-slate-500 font-medium">Blended APY Target</p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-[12px] text-slate-300 mb-5 p-3.5 rounded-xl leading-relaxed"
          style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)' }}>
          {report.summary}
        </p>

        {/* Pool Rankings Table */}
        <div className="overflow-x-auto mb-5 rounded-xl" style={{ border: '1px solid rgba(99,102,241,0.04)' }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.02)' }}>
                {["Pool", "APY", "TVL", "Risk", "Sharpe", "IL Est.", "Alloc", "Conf."].map((h, i) => (
                  <th key={h} className={`py-2.5 px-3 text-slate-500 font-semibold text-[10px] uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.pool_rankings.map((pool, i) => (
                <tr key={i} className="transition-all hover:bg-white/[0.01]"
                  style={{ borderTop: '1px solid rgba(99,102,241,0.03)' }}>
                  <td className="py-2.5 px-3 text-white font-medium">{pool.pool}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-mono font-medium">{pool.apy}%</td>
                  <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                    ${pool.tvl >= 1000 ? `${(pool.tvl / 1000).toFixed(1)}K` : pool.tvl}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <RiskBadge score={pool.risk_score} />
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{pool.sharpe_ratio}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400 font-mono">{pool.il_estimate}</td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.06)' }}>
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${pool.allocation_pct}%` }}
                        />
                      </div>
                      <span className="text-white font-medium w-8 text-right">{pool.allocation_pct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <ConfidenceBadge score={pool.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk Warnings */}
        {report.risk_warnings.length > 0 && (
          <div className="mb-5 space-y-2">
            {report.risk_warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  background: 'rgba(245,158,11,0.04)',
                  border: '1px solid rgba(245,158,11,0.08)',
                }}
              >
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Output Hash */}
        <div className="flex items-center justify-between p-3.5 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)' }}>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Output Hash (On-Chain)</p>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              {outputHash.slice(0, 22)}...{outputHash.slice(-8)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Data Timestamp</p>
            <p className="text-[11px] text-slate-400 mt-1">{new Date(dataTimestamp * 1000).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const style = score >= 70
    ? { background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.12)' }
    : score >= 50
    ? { background: 'rgba(245,158,11,0.08)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.12)' }
    : { background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)' };

  return (
    <span className="inline-block px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium" style={style}>
      {score}
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  return <span className={`font-mono text-[11px] font-medium ${color}`}>{score}%</span>;
}
