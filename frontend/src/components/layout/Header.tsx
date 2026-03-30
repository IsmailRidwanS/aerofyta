"use client";

import { useApp } from "@/lib/providers";

export default function Header() {
  const { wallet, connect, disconnect, openBridge } = useApp();

  return (
    <header className="h-16 bg-[#111827] border-b border-[#1e293b] flex items-center justify-between px-6">
      {/* Left: Chain status */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${wallet.isConnected ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
        <span className="text-sm text-slate-400">
          {wallet.isConnected ? (
            <>Connected to <span className="text-indigo-400 font-mono">aerofyta-1</span></>
          ) : (
            "Not connected"
          )}
        </span>
      </div>

      {/* Right: Bridge + Wallet */}
      <div className="flex items-center gap-3">
        {/* Bridge */}
        <button
          onClick={openBridge}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-[#1e293b] rounded-lg hover:border-[#374151] transition-all"
        >
          Bridge
        </button>

        {/* Wallet */}
        {wallet.isConnected ? (
          <button
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 bg-[#1f2937] border border-[#374151] rounded-lg hover:border-indigo-500/30 transition-all"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
            {wallet.initUsername ? (
              <span className="text-sm text-slate-300">
                {wallet.initUsername}<span className="text-indigo-400">.init</span>
              </span>
            ) : (
              <span className="text-sm font-mono text-slate-300">
                {wallet.address?.slice(0, 8)}...{wallet.address?.slice(-4)}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={connect}
            className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
