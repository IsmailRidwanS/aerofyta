"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: "📊" },
  { name: "Register Agent", href: "/register", icon: "🤖" },
  { name: "Agents", href: "/agents", icon: "👥" },
  { name: "SLA Marketplace", href: "/sla", icon: "📋" },
  { name: "Analytics", href: "/analytics", icon: "📈" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#111827] border-r border-[#1e293b] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e293b]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">AeroFyta</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Agent Operations
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1f2937]"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Protocol Stats */}
      <div className="p-4 border-t border-[#1e293b]">
        <div className="card !p-4 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Protocol</p>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Chain</span>
            <span className="text-indigo-400 font-mono text-xs">aerofyta-1</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">VM</span>
            <span className="text-slate-300">MiniEVM</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Fee</span>
            <span className="text-slate-300">0.5%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
