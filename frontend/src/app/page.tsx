"use client";

import StatsCards from "@/components/dashboard/StatsCards";
import LiveFeed from "@/components/dashboard/LiveFeed";
import RevenueChart from "@/components/dashboard/RevenueChart";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Operations <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Real-time overview of all AI agent operations on AeroFyta
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.12)',
          }}>
          <div className="w-[6px] h-[6px] rounded-full bg-emerald-400 animate-pulse"
            style={{ boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
          <span className="text-[11px] text-emerald-400 font-medium tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveFeed />
        </div>
        <div>
          <RevenueChart />
        </div>
      </div>
    </div>
  );
}
