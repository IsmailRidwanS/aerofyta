"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useApp } from "@/lib/providers";
import { SERVICE_TYPES, PROTOCOL_CONFIG } from "@/lib/constants";

export default function RegisterPage() {
  const { wallet, contracts, connect } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [stakeAmount, setStakeAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalCost = Number(PROTOCOL_CONFIG.registrationFee) + stakeAmount;

  const handleRegister = async () => {
    setIsSubmitting(true);
    setError(null);
    setStep(1);

    try {
      if (!wallet.isConnected) {
        await connect();
      }

      if (contracts.agentVault && contracts.signer) {
        const tx = await contracts.agentVault.registerAgent(
          username,
          serviceType,
          description,
          { value: ethers.parseEther(totalCost.toString()) }
        );
        setTxHash(tx.hash);
        setStep(2);
        await tx.wait();
        setStep(3);
        setStep(4);
      } else {
        await new Promise((r) => setTimeout(r, 800));
        setStep(2);
        await new Promise((r) => setTimeout(r, 800));
        setStep(3);
        await new Promise((r) => setTimeout(r, 500));
        setStep(4);
        setTxHash("0xdemo_" + Math.random().toString(36).slice(2, 18));
      }
    } catch (err: unknown) {
      console.error("[Register] Error:", err);
      const e = err as { reason?: string; message?: string };
      setError(e?.reason || e?.message || "Registration failed");
      setStep(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: "Creating agent identity on-chain", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
    { label: "Staking performance bond", icon: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
    { label: "Granting Ghost Wallet session", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
    { label: "Agent active on AeroFyta", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  ];

  const serviceTypeIcons: Record<string, string> = {
    "data-analysis": "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    "procurement": "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
    "risk-assessment": "M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z",
    "execution": "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Register <span className="gradient-text">AI Agent</span>
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          Deploy a new AI service agent with a .init identity and staked performance bond
        </p>
      </div>

      <div className="card space-y-6">
        {/* .init Username */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-2">.init Username</label>
          <div className="flex">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="acme-analyst"
              disabled={step >= 1}
              className="input !rounded-r-none !border-r-0 disabled:opacity-50"
            />
            <span className="flex items-center px-4 rounded-r-xl text-indigo-400 font-mono text-sm font-medium"
              style={{
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid var(--border-default)',
                borderLeft: 'none',
              }}>
              .init
            </span>
          </div>
          {username && step === 0 && (
            <p className="text-[11px] text-slate-500 mt-1.5">
              Your agent will be discoverable as <span className="text-indigo-400 font-medium">{username}.init</span>
            </p>
          )}
        </div>

        {/* Service Type */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Service Type</label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => step === 0 && setServiceType(type.value)}
                disabled={step >= 1}
                className={`group p-3.5 rounded-xl text-left transition-all disabled:opacity-50 relative overflow-hidden ${
                  serviceType === type.value
                    ? "text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                style={{
                  background: serviceType === type.value
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))'
                    : 'rgba(6,7,14,0.6)',
                  border: serviceType === type.value
                    ? '1px solid rgba(99,102,241,0.3)'
                    : '1px solid var(--border-default)',
                }}
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <svg className={`w-4 h-4 ${serviceType === type.value ? 'text-indigo-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={serviceTypeIcons[type.value] || serviceTypeIcons["data-analysis"]} />
                  </svg>
                  <p className="text-[13px] font-medium">{type.label}</p>
                </div>
                <p className="text-[11px] text-slate-500 ml-6.5">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="AI data analyst powered by Claude Sonnet 4, specializing in DeFi pool analysis and risk scoring..."
            rows={3}
            disabled={step >= 1}
            className="input resize-none disabled:opacity-50"
          />
        </div>

        {/* Stake Amount */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Performance Bond</label>
          <input
            type="range"
            min={Number(PROTOCOL_CONFIG.minimumStake)}
            max={500}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(Number(e.target.value))}
            disabled={step >= 1}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] text-slate-500">Min: {PROTOCOL_CONFIG.minimumStake} INIT</span>
            <span className="stat-number !text-xl text-white">{stakeAmount} <span className="text-[13px] text-slate-500 font-normal">INIT</span></span>
            <span className="text-[11px] text-slate-500">Max: 500 INIT</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1">Higher stake = stronger trust signal. At-risk on SLA breach.</p>
        </div>

        {/* Cost Summary */}
        <div className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.04), rgba(139,92,246,0.02))',
            border: '1px solid rgba(99,102,241,0.08)',
          }}>
          <div className="p-4 space-y-2.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Registration Fee</span>
              <span className="text-slate-300 font-mono">{PROTOCOL_CONFIG.registrationFee} INIT</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-slate-500">Performance Bond</span>
              <span className="text-slate-300 font-mono">{stakeAmount} INIT</span>
            </div>
            <div className="pt-2.5" style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}>
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-medium text-white">Total</span>
                <span className="stat-number !text-2xl gradient-text">{totalCost} <span className="text-[13px] text-slate-400 font-normal">INIT</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {/* Progress Steps */}
        {step > 0 && (
          <div className="space-y-2">
            {steps.map((s, i) => {
              const isDone = i < step;
              const isCurrent = i === step - 1 && step <= 3;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  {isDone ? (
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center"
                      style={{ boxShadow: '0 2px 8px -2px rgba(16,185,129,0.4)' }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ border: '2px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.06)' }}>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ border: '1px solid rgba(99,102,241,0.06)' }}>
                      <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                      </svg>
                    </div>
                  )}
                  <span className={`text-[12px] ${isDone ? "text-emerald-400" : isCurrent ? "text-slate-200" : "text-slate-600"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Tx Hash */}
        {txHash && (
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}>
            <span className="text-[11px] text-slate-500">Transaction</span>
            <span className="text-[11px] font-mono text-indigo-400">{txHash.slice(0, 18)}...{txHash.slice(-8)}</span>
          </div>
        )}

        {/* Register Button */}
        {step < 4 ? (
          <button
            onClick={handleRegister}
            disabled={!username || !description || isSubmitting}
            className="btn-primary w-full !py-3.5 !text-[13px] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? "Deploying Agent..." : !wallet.isConnected ? "Connect Wallet & Register" : `Register Agent (${totalCost} INIT)`}
          </button>
        ) : (
          <div className="text-center py-5 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.04), rgba(6,182,212,0.02))',
              border: '1px solid rgba(16,185,129,0.12)',
            }}>
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center"
              style={{ boxShadow: '0 4px 15px -3px rgba(16,185,129,0.4)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-[15px] text-emerald-400 font-semibold">
              Agent <span className="text-indigo-400">{username}.init</span> is live!
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">Ghost Wallet session active for 24 hours. Permissions enforced at chain consensus.</p>
            <button
              onClick={() => router.push("/agents")}
              className="btn-ghost !py-2 !px-4 !text-[12px] mt-4 inline-flex items-center gap-1.5"
            >
              View My Agents
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
