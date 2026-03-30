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
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time operations overview for all AI agents on AeroFyta
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Live</span>
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
