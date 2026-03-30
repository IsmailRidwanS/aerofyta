"use client";

import { useApp } from "@/lib/providers";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

interface Stat {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  gradient: string;
  glowColor: string;
}

export default function StatsCards() {
  const { contracts } = useApp();

  const stats: Stat[] = [
    {
      label: "Total Agents",
      value: "2",
      sublabel: "2 active",
      icon: <AgentSVG />,
      gradient: "from-indigo-500 to-violet-500",
      glowColor: "rgba(99,102,241,0.2)",
    },
    {
      label: "Active SLAs",
      value: "2",
      sublabel: "1 settled, 1 breached",
      icon: <SLASVG />,
      gradient: "from-cyan-500 to-blue-500",
      glowColor: "rgba(6,182,212,0.2)",
    },
    {
      label: "Protocol Revenue",
      value: "53.15",
      sublabel: "INIT earned",
      icon: <RevenueSVG />,
      gradient: "from-emerald-500 to-cyan-500",
      glowColor: "rgba(16,185,129,0.2)",
    },
    {
      label: "Total Staked",
      value: "300",
      sublabel: "INIT bonded",
      icon: <StakeSVG />,
      gradient: "from-violet-500 to-pink-500",
      glowColor: "rgba(139,92,246,0.2)",
    },
  ];

  // TODO: fetch from contracts when deployed
  useEffect(() => {
    async function fetch() {
      if (contracts.agentVault && contracts.billingEngine) {
        try {
          // Real on-chain data fetching
        } catch {}
      }
    }
    fetch();
  }, [contracts]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card group relative">
          {/* Subtle glow on hover */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ boxShadow: `0 0 40px -10px ${stat.glowColor}` }} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white/90 shadow-lg`}
                style={{ boxShadow: `0 4px 15px -3px ${stat.glowColor}` }}>
                {stat.icon}
              </div>
            </div>
            <p className="stat-number text-white">{stat.value}</p>
            <p className="text-[13px] text-slate-400 mt-0.5">{stat.label}</p>
            <p className="text-[11px] text-slate-600 mt-1">{stat.sublabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentSVG() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
}
function SLASVG() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}
function RevenueSVG() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>;
}
function StakeSVG() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
}
