"use client";

import { useApp } from "@/lib/providers";

export default function Header() {
  const { wallet, connect, disconnect, openBridge } = useApp();

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[rgba(99,102,241,0.06)]"
      style={{ background: 'rgba(6,7,14,0.8)', backdropFilter: 'blur(20px)' }}>
      {/* Left: Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }}>
          <div className={`w-[6px] h-[6px] rounded-full ${wallet.isConnected ? "bg-emerald-400" : "bg-slate-600"}`}
            style={wallet.isConnected ? { boxShadow: '0 0 8px rgba(52,211,153,0.5)' } : {}} />
          <span className="text-[12px] text-slate-400">
            {wallet.isConnected ? (
              <>Connected to <span className="text-indigo-400 font-mono font-medium">aerofyta-1</span></>
            ) : (
              "Not connected"
            )}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Bridge */}
        <button onClick={openBridge} className="btn-ghost !py-1.5 !px-3 !text-[12px] flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Bridge
        </button>

        {/* Wallet */}
        {wallet.isConnected ? (
          <button onClick={disconnect}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))',
              border: '1px solid rgba(99,102,241,0.15)'
            }}>
            <div className="w-[6px] h-[6px] rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.5)' }} />
            {wallet.initUsername ? (
              <span className="text-[12px] font-medium text-slate-200">
                {wallet.initUsername}<span className="text-indigo-400">.init</span>
              </span>
            ) : (
              <span className="text-[12px] font-mono text-slate-300">
                {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-4)}
              </span>
            )}
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        ) : (
          <button onClick={connect} className="btn-primary !py-1.5 !px-4 !text-[12px]">
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
