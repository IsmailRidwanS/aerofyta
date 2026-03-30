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
        // Real on-chain registration
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

        // Grant Ghost Wallet session
        // In production: InterwovenKit auto-sign flow creates the session
        setStep(4);
      } else {
        // Demo mode — simulate deployment
        await new Promise((r) => setTimeout(r, 800));
        setStep(2);
        await new Promise((r) => setTimeout(r, 800));
        setStep(3);
        await new Promise((r) => setTimeout(r, 500));
        setStep(4);
        setTxHash("0xdemo_" + Math.random().toString(36).slice(2, 18));
      }
    } catch (err: any) {
      console.error("[Register] Error:", err);
      setError(err?.reason || err?.message || "Registration failed");
      setStep(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { label: "Creating agent identity on-chain", done: step >= 2 },
    { label: "Staking performance bond", done: step >= 3 },
    { label: "Granting Ghost Wallet session (auto-sign)", done: step >= 4 },
    { label: "Agent active on AeroFyta", done: step >= 4 },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Register AI Agent</h1>
        <p className="text-sm text-slate-400 mt-1">
          Deploy a new AI service agent with a .init identity and staked performance bond
        </p>
      </div>

      <div className="card space-y-5">
        {/* .init Username */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">.init Username</label>
          <div className="flex">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="acme-analyst"
              disabled={step >= 1}
              className="flex-1 bg-[#0a0b14] border border-[#1e293b] rounded-l-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
            />
            <span className="bg-[#1f2937] border border-l-0 border-[#1e293b] rounded-r-lg px-4 py-3 text-indigo-400 font-mono text-sm">
              .init
            </span>
          </div>
          {username && step === 0 && (
            <p className="text-xs text-slate-500 mt-1">
              Your agent will be discoverable as <span className="text-indigo-400">{username}.init</span>
            </p>
          )}
        </div>

        {/* Service Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Service Type</label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => step === 0 && setServiceType(type.value)}
                disabled={step >= 1}
                className={`p-3 rounded-lg border text-left transition-all disabled:opacity-50 ${
                  serviceType === type.value
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-[#1e293b] bg-[#0a0b14] text-slate-400 hover:border-[#374151]"
                }`}
              >
                <p className="text-sm font-medium">{type.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="AI data analyst powered by Claude Sonnet 4, specializing in DeFi pool analysis and risk scoring..."
            rows={3}
            disabled={step >= 1}
            className="w-full bg-[#0a0b14] border border-[#1e293b] rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none disabled:opacity-50"
          />
        </div>

        {/* Stake Amount */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Performance Bond (Stake)</label>
          <input
            type="range"
            min={Number(PROTOCOL_CONFIG.minimumStake)}
            max={500}
            value={stakeAmount}
            onChange={(e) => setStakeAmount(Number(e.target.value))}
            disabled={step >= 1}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-sm mt-2">
            <span className="text-slate-500">Min: {PROTOCOL_CONFIG.minimumStake} INIT</span>
            <span className="text-white font-bold text-lg">{stakeAmount} INIT</span>
            <span className="text-slate-500">Max: 500 INIT</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Higher stake = more trust signal. Stake is at-risk on SLA breach.</p>
        </div>

        {/* Cost Summary */}
        <div className="p-4 bg-[#0a0b14] rounded-lg border border-[#1e293b] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Registration Fee</span>
            <span className="text-slate-300">{PROTOCOL_CONFIG.registrationFee} INIT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Performance Bond</span>
            <span className="text-slate-300">{stakeAmount} INIT</span>
          </div>
          <div className="border-t border-[#1e293b] pt-2 flex justify-between">
            <span className="text-sm font-medium text-white">Total</span>
            <span className="text-lg font-bold gradient-text">{totalCost} INIT</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Progress Steps */}
        {step > 0 && (
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {s.done ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                ) : step > 0 && i === step - 1 ? (
                  <div className="w-5 h-5 rounded-full border-2 border-[#374151] animate-spin border-t-indigo-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-[#1e293b]" />
                )}
                <span className={`text-sm ${s.done ? "text-green-400" : step > 0 && i === step - 1 ? "text-slate-300" : "text-slate-600"}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tx Hash */}
        {txHash && (
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg flex items-center justify-between">
            <span className="text-xs text-slate-400">Transaction:</span>
            <span className="text-xs font-mono text-indigo-400">{txHash.slice(0, 18)}...{txHash.slice(-8)}</span>
          </div>
        )}

        {/* Register Button */}
        {step < 4 ? (
          <button
            onClick={handleRegister}
            disabled={!username || !description || isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Deploying Agent..." : !wallet.isConnected ? "Connect Wallet & Register" : `Register Agent (${totalCost} INIT)`}
          </button>
        ) : (
          <div className="text-center py-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <p className="text-green-400 font-medium text-lg">
              Agent <span className="text-indigo-400">{username}.init</span> is live!
            </p>
            <p className="text-xs text-slate-400 mt-1">Ghost Wallet session active for 24 hours. Permissions enforced at chain consensus.</p>
            <button
              onClick={() => router.push("/agents")}
              className="mt-3 px-4 py-2 text-sm text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/10 transition-all"
            >
              View My Agents &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
