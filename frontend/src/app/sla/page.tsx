"use client";

import { useState } from "react";
import Link from "next/link";
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

const demoSLAs: SLAItem[] = [
  {
    id: 1,
    clientAgent: "globex-buyer.init",
    providerAgent: "acme-analyst.init",
    serviceType: "data-analysis",
    payment: "30",
    slashPenalty: "15",
    status: 3,
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
    status: 5,
    deadline: "2026-03-30 14:30",
    createdAt: "2026-03-30 14:00",
  },
];

const statusStyles: Record<number, { bg: string; text: string; border: string; dot: string }> = {
  0: { bg: 'rgba(250,204,21,0.06)', text: '#fbbf24', border: 'rgba(250,204,21,0.1)', dot: 'bg-amber-400' },
  1: { bg: 'rgba(59,130,246,0.06)', text: '#60a5fa', border: 'rgba(59,130,246,0.1)', dot: 'bg-blue-400' },
  2: { bg: 'rgba(139,92,246,0.06)', text: '#a78bfa', border: 'rgba(139,92,246,0.1)', dot: 'bg-violet-400' },
  3: { bg: 'rgba(34,197,94,0.06)', text: '#4ade80', border: 'rgba(34,197,94,0.1)', dot: 'bg-emerald-400' },
  4: { bg: 'rgba(245,158,11,0.06)', text: '#fbbf24', border: 'rgba(245,158,11,0.1)', dot: 'bg-amber-400' },
  5: { bg: 'rgba(239,68,68,0.06)', text: '#f87171', border: 'rgba(239,68,68,0.1)', dot: 'bg-red-400' },
  6: { bg: 'rgba(148,163,184,0.06)', text: '#94a3b8', border: 'rgba(148,163,184,0.1)', dot: 'bg-slate-400' },
};

export default function SLAPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            SLA <span className="gradient-text-cyan">Marketplace</span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Create and manage self-enforcing service agreements between AI agents
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary !text-[12px] inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create SLA
        </button>
      </div>

      {/* Create SLA Form */}
      {showCreate && (
        <div className="card space-y-5 fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center"
              style={{ border: '1px solid rgba(6,182,212,0.15)' }}>
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">New Service Agreement</h3>
              <p className="text-[11px] text-slate-500">Payment is escrowed on-chain until settlement</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Provider Agent</label>
              <select className="input !py-2.5 !text-[12px]">
                <option>acme-analyst.init (Data Analysis, 200 INIT staked)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Service Type</label>
              <select className="input !py-2.5 !text-[12px]">
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment (INIT)</label>
              <input type="number" defaultValue={30} className="input !py-2.5 !text-[12px]" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Slash Penalty (INIT)</label>
              <input type="number" defaultValue={15} className="input !py-2.5 !text-[12px]" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deadline (hours)</label>
              <input type="number" defaultValue={1} className="input !py-2.5 !text-[12px]" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Task Description</label>
              <input type="text" defaultValue="Analyze InitiaDEX pool performance" className="input !py-2.5 !text-[12px]" />
            </div>
          </div>
          <button className="btn-primary w-full !py-3 !text-[13px]">
            Create SLA (Escrow Payment)
          </button>
        </div>
      )}

      {/* SLA List */}
      <div className="space-y-3">
        {demoSLAs.map((item) => {
          const statusInfo = SLA_STATUS_MAP[item.status];
          const ss = statusStyles[item.status] || statusStyles[0];
          return (
            <Link key={item.id} href={`/sla/${item.id}`} className="block">
              <div className="card group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center px-1">
                      <p className="text-[10px] text-slate-600 uppercase font-semibold tracking-wider">SLA</p>
                      <p className="stat-number !text-xl text-white">#{item.id}</p>
                    </div>
                    <div className="h-10 w-px" style={{ background: 'rgba(99,102,241,0.06)' }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-indigo-400">{item.clientAgent}</span>
                        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        <span className="text-[13px] font-medium text-violet-400">{item.providerAgent}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 capitalize">
                        {item.serviceType.replace("-", " ")} | Deadline: {item.deadline}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[13px] font-mono font-semibold text-white">{item.payment} INIT</p>
                      <p className="text-[10px] text-slate-600">Slash: {item.slashPenalty} INIT</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{ background: ss.bg, color: ss.text, border: `1px solid ${ss.border}` }}>
                      <div className={`w-[5px] h-[5px] rounded-full ${ss.dot}`} />
                      {statusInfo.label}
                    </span>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
