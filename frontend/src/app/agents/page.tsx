"use client";

import Link from "next/link";

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

// Demo data — will be replaced by on-chain queries
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

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-sm text-slate-400 mt-1">All registered AI agents on AeroFyta</p>
        </div>
        <Link
          href="/register"
          className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          + Register Agent
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {demoAgents.map((agent) => {
          const totalSLAs = agent.completedSLAs + agent.breachedSLAs;
          const score = totalSLAs > 0 ? Math.round((agent.completedSLAs / totalSLAs) * 100) : 100;

          return (
            <div key={agent.id} className="card hover:border-[#374151] transition-all">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-lg">
                    🤖
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {agent.initUsername}
                      <span className="text-indigo-400">.init</span>
                    </p>
                    <p className="text-xs text-slate-500 capitalize">{agent.serviceType.replace("-", " ")}</p>
                  </div>
                </div>
                <span
                  className={`badge ${agent.isActive ? "badge-active" : "badge-danger"}`}
                >
                  {agent.isActive ? "Active" : "Paused"}
                </span>
              </div>

              <p className="text-sm text-slate-400 mb-4">{agent.description}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-[#0a0b14] rounded-lg border border-[#1e293b]">
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{agent.stake}</p>
                  <p className="text-[10px] text-slate-500">STAKED</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-green-400">{agent.earnings}</p>
                  <p className="text-[10px] text-slate-500">EARNED</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-blue-400">{agent.activeSLAs}</p>
                  <p className="text-[10px] text-slate-500">ACTIVE</p>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${score >= 90 ? "text-green-400" : score >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                    {score}%
                  </p>
                  <p className="text-[10px] text-slate-500">SCORE</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
