/**
 * AeroFyta — Agents Data Hook
 * Fetches and manages agent data from AgentVault contract.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export interface Agent {
  id: number;
  owner: string;
  initUsername: string;
  serviceType: string;
  description: string;
  stake: string;
  earnings: string;
  activeSLAs: number;
  ghostWallet: string;
  sessionExpiry: number;
  maxPerTx: string;
  isActive: boolean;
  registeredAt: number;
  performanceScore: number;
}

// Demo data — replaced with on-chain queries when contracts are deployed
const DEMO_AGENTS: Agent[] = [
  {
    id: 1,
    owner: "0xA11CE",
    initUsername: "acme-analyst",
    serviceType: "data-analysis",
    description: "AI data analyst powered by Claude Sonnet 4. Specializes in DeFi pool analysis, risk scoring, and allocation recommendations.",
    stake: "200",
    earnings: "29.85",
    activeSLAs: 0,
    ghostWallet: "0xA1...ghost",
    sessionExpiry: Math.floor(Date.now() / 1000) + 86400,
    maxPerTx: "100",
    isActive: true,
    registeredAt: Math.floor(Date.now() / 1000) - 3600,
    performanceScore: 50,
  },
  {
    id: 2,
    owner: "0xB0B",
    initUsername: "globex-buyer",
    serviceType: "procurement",
    description: "Autonomous procurement agent. Discovers providers, creates SLAs, evaluates deliveries.",
    stake: "100",
    earnings: "42",
    activeSLAs: 0,
    ghostWallet: "0xB1...ghost",
    sessionExpiry: Math.floor(Date.now() / 1000) + 86400,
    maxPerTx: "100",
    isActive: true,
    registeredAt: Math.floor(Date.now() / 1000) - 3000,
    performanceScore: 100,
  },
];

export function useAgents(agentVault: ethers.Contract | null) {
  const [agents, setAgents] = useState<Agent[]>(DEMO_AGENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!agentVault) {
      setAgents(DEMO_AGENTS);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [activeAgents, total] = await agentVault.getActiveAgents(0, 50);
      const mapped: Agent[] = activeAgents.map((a: any, i: number) => ({
        id: i + 1,
        owner: a.owner,
        initUsername: a.initUsername,
        serviceType: a.serviceType,
        description: a.description,
        stake: ethers.formatEther(a.stake),
        earnings: ethers.formatEther(a.earnings),
        activeSLAs: Number(a.activeSLAs),
        ghostWallet: a.ghostWallet,
        sessionExpiry: Number(a.sessionExpiry),
        maxPerTx: ethers.formatEther(a.maxPerTx),
        isActive: a.isActive,
        registeredAt: Number(a.registeredAt),
        performanceScore: 100, // TODO: compute from SLA history
      }));
      setAgents(mapped);
    } catch (err: any) {
      console.error("[useAgents] Error:", err);
      setError(err.message);
      setAgents(DEMO_AGENTS);
    } finally {
      setLoading(false);
    }
  }, [agentVault]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}
