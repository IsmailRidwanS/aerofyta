"use client";

interface WalletButtonProps {
  address: string | null;
  initUsername: string | null;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function WalletButton({
  address,
  initUsername,
  isConnected,
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  if (isConnected && address) {
    return (
      <button
        onClick={onDisconnect}
        className="flex items-center gap-2 px-4 py-2 bg-[#1f2937] border border-[#374151] rounded-lg hover:border-indigo-500/30 transition-all"
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        {initUsername ? (
          <span className="text-sm text-slate-300">
            {initUsername}<span className="text-indigo-400">.init</span>
          </span>
        ) : (
          <span className="text-sm font-mono text-slate-300">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onConnect}
      className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20"
    >
      Connect Wallet
    </button>
  );
}
