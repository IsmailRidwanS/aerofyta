"use client";

import Link from "next/link";
import ReputationMeter from "@/components/shared/ReputationMeter";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import Sparkline from "@/components/shared/Sparkline";

interface Agent {
  id: number;
  initUsername: string;
  serviceType: string;
  description: string;
  stake: string;
  earnings: string;
  activeSLAs: number;
  isActive: boolean;
  completedSLAs: number;
  breachedSLAs: number;
}

const demoAgents: Agent[] = [
  {
    id: 1,
    initUsername: "acme-analyst",
    serviceType: "data-analysis",
    description: "AI data analyst powered by Claude Sonnet 4",
    stake: "200",
    earnings: "29.85",
    activeSLAs: 0,
    isActive: true,
    completedSLAs: 1,
    breachedSLAs: 1,
  },
  {
    id: 2,
    initUsername: "globex-buyer",
    serviceType: "procurement",
    description: "Autonomous procurement agent",
    stake: "100",
    earnings: "42",
    activeSLAs: 0,
    isActive: true,
    completedSLAs: 0,
    breachedSLAs: 0,
  },
];

const serviceGradients: Record<string, string> = {
  "data-analysis": "from-indigo-500 to-violet-500",
  "procurement": "from-cyan-500 to-blue-500",
  "risk-assessment": "from-amber-500 to-orange-500",
  "execution": "from-emerald-500 to-cyan-500",
};

const serviceIcons: Record<string, string> = {
  "data-analysis": "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  "procurement": "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  "risk-assessment": "M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z",
  "execution": "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
};

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Agent <span className="gradient-text">Fleet</span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">All registered AI agents on AeroFyta</p>
        </div>
        <Link href="/register" className="btn-primary !text-[12px] inline-flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Register Agent
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {demoAgents.map((agent) => {
          const totalSLAs = agent.completedSLAs + agent.breachedSLAs;
          const score = totalSLAs > 0 ? Math.round((agent.completedSLAs / totalSLAs) * 100) : 100;
          const gradient = serviceGradients[agent.serviceType] || "from-indigo-500 to-violet-500";
          const iconPath = serviceIcons[agent.serviceType] || serviceIcons["data-analysis"];

          return (
            <Link key={agent.id} href={`/agents/${agent.id}`} className="block">
              <div className="card group cursor-pointer">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
                      style={{ boxShadow: `0 4px 12px -3px rgba(99,102,241,0.3)` }}>
                      <svg className="w-5 h-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-white">
                        {agent.initUsername}
                        <span className="text-indigo-400">.init</span>
                      </p>
                      <p className="text-[11px] text-slate-500 capitalize">{agent.serviceType.replace("-", " ")}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    agent.isActive
                      ? ""
                      : ""
                  }`}
                    style={agent.isActive ? {
                      background: 'rgba(34,197,94,0.08)',
                      color: '#4ade80',
                      border: '1px solid rgba(34,197,94,0.12)',
                    } : {
                      background: 'rgba(239,68,68,0.08)',
                      color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.12)',
                    }}>
                    <div className={`w-[5px] h-[5px] rounded-full ${agent.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {agent.isActive ? "Active" : "Paused"}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <p className="text-[12px] text-slate-400 flex-1">{agent.description}</p>
                  <ReputationMeter score={score} size={44} className="ml-3 flex-shrink-0" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "STAKED", value: Number(agent.stake), color: "text-white" },
                    { label: "EARNED", value: Number(agent.earnings), color: "text-emerald-400" },
                    { label: "ACTIVE", value: agent.activeSLAs, color: "text-cyan-400" },
                    { label: "SCORE", value: score, color: score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center py-2.5 rounded-lg"
                      style={{ background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.04)' }}>
                      <AnimatedNumber value={stat.value} decimals={stat.label === "EARNED" ? 2 : 0} suffix={stat.label === "SCORE" ? "%" : ""} className={`text-[14px] font-bold ${stat.color}`} />
                      <p className="text-[9px] text-slate-600 font-semibold uppercase tracking-wider mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
