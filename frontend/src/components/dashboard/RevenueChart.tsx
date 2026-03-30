"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const revenueData = {
  "7D": [
    { day: "Mon", revenue: 0, fees: 0, slash: 0 },
    { day: "Tue", revenue: 25, fees: 0, slash: 0 },
    { day: "Wed", revenue: 25, fees: 0, slash: 0 },
    { day: "Thu", revenue: 50, fees: 0, slash: 0 },
    { day: "Fri", revenue: 50.15, fees: 0.15, slash: 0 },
    { day: "Sat", revenue: 53.15, fees: 0.15, slash: 3 },
    { day: "Sun", revenue: 53.15, fees: 0.15, slash: 3 },
  ],
  "30D": [
    { day: "W1", revenue: 0, fees: 0, slash: 0 },
    { day: "W2", revenue: 12, fees: 0, slash: 0 },
    { day: "W3", revenue: 35, fees: 0.08, slash: 0 },
    { day: "W4", revenue: 53.15, fees: 0.15, slash: 3 },
  ],
  "ALL": [
    { day: "Launch", revenue: 0, fees: 0, slash: 0 },
    { day: "Day 1", revenue: 50, fees: 0, slash: 0 },
    { day: "Day 2", revenue: 53.15, fees: 0.15, slash: 3 },
  ],
};

type Period = "7D" | "30D" | "ALL";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-[11px]" style={{
      background: 'rgba(15,16,41,0.95)',
      border: '1px solid rgba(99,102,241,0.15)',
      backdropFilter: 'blur(10px)',
    }}>
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-white font-mono font-semibold">{payload[0]?.value?.toFixed(2)} INIT</p>
    </div>
  );
};

export default function RevenueChart() {
  const [period, setPeriod] = useState<Period>("7D");

  const revenue = {
    fees: "0.15",
    slashing: "3.00",
    registration: "50.00",
    total: "53.15",
    slasSettled: 1,
    slasBreached: 1,
  };

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center"
            style={{ border: '1px solid rgba(16,185,129,0.15)' }}>
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Revenue</h2>
            <p className="text-[11px] text-slate-500">Protocol earnings</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
          {(["7D", "30D", "ALL"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                period === p
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="text-center py-3 rounded-xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.03))',
          border: '1px solid rgba(99,102,241,0.08)',
        }}>
        <p className="stat-number gradient-text">{revenue.total}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Total INIT Earned</p>
      </div>

      {/* Recharts Area Chart */}
      <div className="h-[120px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueData[period]} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#475569' }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 1 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <RevenueRow label="Platform Fees (0.5%)" value={`${revenue.fees} INIT`} gradient="from-indigo-500 to-violet-500" percentage={0.3} />
        <RevenueRow label="Slash Revenue (20%)" value={`${revenue.slashing} INIT`} gradient="from-red-500 to-rose-500" percentage={5.6} />
        <RevenueRow label="Registration Fees" value={`${revenue.registration} INIT`} gradient="from-cyan-500 to-blue-500" percentage={94.1} />
      </div>

      {/* SLA Stats */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="text-center py-3 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.08)' }}>
          <p className="text-xl font-bold text-emerald-400" style={{ fontFeatureSettings: "'tnum'" }}>{revenue.slasSettled}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">SLAs Settled</p>
        </div>
        <div className="text-center py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}>
          <p className="text-xl font-bold text-red-400" style={{ fontFeatureSettings: "'tnum'" }}>{revenue.slasBreached}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">SLAs Breached</p>
        </div>
      </div>
    </div>
  );
}

function RevenueRow({ label, value, gradient, percentage }: { label: string; value: string; gradient: string; percentage: number }) {
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono font-medium">{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.06)' }}>
        <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`}
          style={{ width: `${Math.max(percentage, 2)}%` }} />
      </div>
    </div>
  );
}
