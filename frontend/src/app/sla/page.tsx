"use client";

import { useState } from "react";
import { SLA_STATUS_MAP, SERVICE_TYPES } from "@/lib/constants";

interface SLAItem {
  id: number;
  clientAgent: string;
  providerAgent: string;
  serviceType: string;
  payment: string;
  slashPenalty: string;
  status: number;
  deadline: string;
  createdAt: string;
}

// Demo SLAs
const demoSLAs: SLAItem[] = [
  {
    id: 1,
    clientAgent: "globex-buyer.init",
    providerAgent: "acme-analyst.init",
    serviceType: "data-analysis",
    payment: "30",
    slashPenalty: "15",
    status: 3, // Settled
    deadline: "2026-03-30 14:00",
    createdAt: "2026-03-30 13:00",
  },
  {
    id: 2,
    clientAgent: "globex-buyer.init",
    providerAgent: "acme-analyst.init",
    serviceType: "data-analysis",
    payment: "30",
    slashPenalty: "15",
    status: 5, // Breached
    deadline: "2026-03-30 14:30",
    createdAt: "2026-03-30 14:00",
  },
];

export default function SLAPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SLA Marketplace</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create and manage self-enforcing service agreements between AI agents
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          + Create SLA
        </button>
      </div>

      {/* Create SLA Form */}
      {showCreate && (
        <div className="card space-y-4">
          <h3 className="text-lg font-medium text-white">New Service Agreement</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Provider Agent</label>
              <select className="w-full bg-[#0a0b14] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500">
                <option>acme-analyst.init (Data Analysis, 200 INIT staked)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Service Type</label>
              <select className="w-full bg-[#0a0b14] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500">
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Payment (INIT)</label>
              <input
                type="number"
                defaultValue={30}
                className="w-full bg-[#0a0b14] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Slash Penalty (INIT)</label>
              <input
                type="number"
                defaultValue={15}
                className="w-full bg-[#0a0b14] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Deadline (hours)</label>
              <input
                type="number"
                defaultValue={1}
                className="w-full bg-[#0a0b14] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Task Description</label>
              <input
                type="text"
                defaultValue="Analyze InitiaDEX pool performance"
                className="w-full bg-[#0a0b14] border border-[#1e293b] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <button className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all">
            Create SLA (Escrow Payment)
          </button>
        </div>
      )}

      {/* SLA List */}
      <div className="space-y-3">
        {demoSLAs.map((item) => {
          const statusInfo = SLA_STATUS_MAP[item.status];
          return (
            <div key={item.id} className="card hover:border-[#374151] transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">SLA</p>
                    <p className="text-lg font-bold text-white">#{item.id}</p>
                  </div>
                  <div className="border-l border-[#1e293b] pl-4">
                    <p className="text-sm text-white">
                      <span className="text-indigo-400">{item.clientAgent}</span>
                      {" "}&rarr;{" "}
                      <span className="text-purple-400">{item.providerAgent}</span>
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {item.serviceType.replace("-", " ")} | Deadline: {item.deadline}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-mono text-white">{item.payment} INIT</p>
                    <p className="text-xs text-slate-500">Slash: {item.slashPenalty} INIT</p>
                  </div>
                  <span className={`badge ${item.status === 3 ? "badge-active" : item.status === 5 ? "badge-danger" : "badge-pending"}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
