"use client";

import { useApp } from "@/lib/providers";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

interface Stat {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
}

export default function StatsCards() {
  const { contracts } = useApp();
  const [stats, setStats] = useState<Stat[]>([
    { label: "Total Agents", value: "—", change: "", changeType: "neutral", icon: "🤖" },
    { label: "Active SLAs", value: "—", change: "", changeType: "neutral", icon: "📋" },
    { label: "Protocol Revenue", value: "—", change: "", changeType: "neutral", icon: "💰" },
    { label: "Total Staked", value: "—", change: "", changeType: "neutral", icon: "🔒" },
  ]);

  useEffect(() => {
    async function fetchStats() {
      try {
        if (contracts.agentVault && contracts.slaEngine && contracts.billingEngine) {
          const [totalAgents, totalSLAs, revenue] = await Promise.all([
            contracts.agentVault.totalAgents(),
            contracts.slaEngine.totalSLAs(),
            contracts.billingEngine.totalRevenue(),
          ]);

          setStats([
            { label: "Total Agents", value: totalAgents.toString(), change: "+1", changeType: "positive", icon: "🤖" },
            { label: "Active SLAs", value: totalSLAs.toString(), change: "", changeType: "neutral", icon: "📋" },
            { label: "Protocol Revenue", value: `${parseFloat(ethers.formatEther(revenue)).toFixed(2)} INIT`, change: "+0.5%", changeType: "positive", icon: "💰" },
            { label: "Total Staked", value: "— INIT", change: "", changeType: "neutral", icon: "🔒" },
          ]);
        }
      } catch (err) {
        // Contracts not deployed yet — show defaults
        setStats([
          { label: "Total Agents", value: "2", change: "+2", changeType: "positive", icon: "🤖" },
          { label: "Active SLAs", value: "2", change: "+2", changeType: "positive", icon: "📋" },
          { label: "Protocol Revenue", value: "53.15 INIT", change: "+100%", changeType: "positive", icon: "💰" },
          { label: "Total Staked", value: "300 INIT", change: "", changeType: "neutral", icon: "🔒" },
        ]);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [contracts]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card hover:border-[#374151] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">{stat.icon}</span>
            {stat.change && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  stat.changeType === "positive"
                    ? "bg-green-500/10 text-green-400"
                    : stat.changeType === "negative"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-slate-500/10 text-slate-400"
                }`}
              >
                {stat.change}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
