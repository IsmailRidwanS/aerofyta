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
    <div className="card border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-transparent">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm">
            AI
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Analysis Report</h3>
            <p className="text-xs text-slate-500">
              {modelId} (v{modelVersion}) | {dataPoints} data points
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold gradient-text">{report.blended_apy}%</p>
          <p className="text-[10px] text-slate-500">Blended APY Target</p>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-300 mb-4 p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b]">
        {report.summary}
      </p>

      {/* Pool Rankings Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e293b]">
              <th className="text-left py-2 px-3 text-slate-500 font-medium text-xs">Pool</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">APY</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">TVL</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">Risk</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">Sharpe</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">IL Est.</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">Alloc</th>
              <th className="text-right py-2 px-3 text-slate-500 font-medium text-xs">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {report.pool_rankings.map((pool, i) => (
              <tr key={i} className="border-b border-[#1e293b]/50 hover:bg-[#1f2937]/30">
                <td className="py-2.5 px-3 text-white font-medium">{pool.pool}</td>
                <td className="py-2.5 px-3 text-right text-green-400 font-mono">{pool.apy}%</td>
                <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                  ${pool.tvl >= 1000 ? `${(pool.tvl / 1000).toFixed(1)}K` : pool.tvl}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <RiskBadge score={pool.risk_score} />
                </td>
                <td className="py-2.5 px-3 text-right text-slate-300 font-mono">{pool.sharpe_ratio}</td>
                <td className="py-2.5 px-3 text-right text-yellow-400 font-mono">{pool.il_estimate}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 bg-[#0a0b14] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
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
        <div className="mb-4 space-y-2">
          {report.risk_warnings.map((warning, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2.5 bg-yellow-500/5 border border-yellow-500/10 rounded-lg"
            >
              <span className="text-yellow-500 text-sm mt-0.5">⚠</span>
              <p className="text-xs text-yellow-300">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Output Hash */}
      <div className="flex items-center justify-between p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b]">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Output Hash (On-Chain)</p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            {outputHash.slice(0, 22)}...{outputHash.slice(-8)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">Data Timestamp</p>
          <p className="text-xs text-slate-400">{new Date(dataTimestamp * 1000).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-400 bg-green-500/10" :
                score >= 50 ? "text-yellow-400 bg-yellow-500/10" :
                "text-red-400 bg-red-500/10";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono ${color}`}>
      {score}
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" :
                score >= 60 ? "text-yellow-400" :
                "text-red-400";
  return <span className={`font-mono text-xs ${color}`}>{score}%</span>;
}
