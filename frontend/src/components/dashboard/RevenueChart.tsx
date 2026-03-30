"use client";

export default function RevenueChart() {
  // TODO: Replace with real data from BillingEngine contract
  const revenue = {
    fees: "0.15",
    slashing: "3.00",
    registration: "50.00",
    total: "53.15",
    slasSettled: 1,
    slasBreached: 1,
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-white">Protocol Revenue</h2>

      {/* Total */}
      <div className="text-center py-4 bg-[#0a0b14] rounded-lg border border-[#1e293b]">
        <p className="text-3xl font-bold gradient-text">{revenue.total}</p>
        <p className="text-sm text-slate-400 mt-1">Total INIT Earned</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <RevenueRow label="Platform Fees (0.5%)" value={`${revenue.fees} INIT`} color="bg-indigo-500" percentage={0.3} />
        <RevenueRow label="Slash Revenue (20%)" value={`${revenue.slashing} INIT`} color="bg-red-500" percentage={5.6} />
        <RevenueRow label="Registration Fees" value={`${revenue.registration} INIT`} color="bg-blue-500" percentage={94.1} />
      </div>

      {/* SLA Stats */}
      <div className="pt-4 border-t border-[#1e293b] grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-xl font-bold text-green-400">{revenue.slasSettled}</p>
          <p className="text-xs text-slate-400">SLAs Settled</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-red-400">{revenue.slasBreached}</p>
          <p className="text-xs text-slate-400">SLAs Breached</p>
        </div>
      </div>

      {/* Sequencer Revenue Note */}
      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
        <p className="text-xs text-indigo-300">
          + Sequencer gas revenue from all txs on aerofyta-1
        </p>
      </div>
    </div>
  );
}

function RevenueRow({
  label,
  value,
  color,
  percentage,
}: {
  label: string;
  value: string;
  color: string;
  percentage: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-[#0a0b14] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    </div>
  );
}
