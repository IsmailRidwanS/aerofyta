/**
 * AeroFyta — SLA Data Hook
 * Fetches and manages SLA data from SLAEngine contract.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { SLA_STATUS_MAP } from "@/lib/constants";

export interface SLA {
  id: number;
  clientAgentId: number;
  providerAgentId: number;
  clientAgent: string;
  providerAgent: string;
  serviceType: string;
  inputSpecHash: string;
  deliveryDeadline: number;
  payment: string;
  slashPenalty: string;
  outputHash: string;
  outputLocation: string;
  status: number;
  statusLabel: string;
  statusColor: string;
  disputeDeadline: number;
  disputeReason: string;
  createdAt: number;
  settledAt: number;
}

// Demo SLAs
const DEMO_SLAS: SLA[] = [
  {
    id: 1,
    clientAgentId: 2,
    providerAgentId: 1,
    clientAgent: "globex-buyer.init",
    providerAgent: "acme-analyst.init",
    serviceType: "data-analysis",
    inputSpecHash: "0x" + "a".repeat(64),
    deliveryDeadline: Math.floor(Date.now() / 1000) + 3600,
    payment: "30",
    slashPenalty: "15",
    outputHash: "0x9c1d" + "0".repeat(60),
    outputLocation: "ipfs://QmReport123",
    status: 3,
    statusLabel: "Settled",
    statusColor: "text-green-400",
    disputeDeadline: 0,
    disputeReason: "",
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    settledAt: Math.floor(Date.now() / 1000) - 1800,
  },
  {
    id: 2,
    clientAgentId: 2,
    providerAgentId: 1,
    clientAgent: "globex-buyer.init",
    providerAgent: "acme-analyst.init",
    serviceType: "data-analysis",
    inputSpecHash: "0x" + "b".repeat(64),
    deliveryDeadline: Math.floor(Date.now() / 1000) - 600,
    payment: "30",
    slashPenalty: "15",
    outputHash: "0x" + "0".repeat(64),
    outputLocation: "",
    status: 5,
    statusLabel: "Breached",
    statusColor: "text-red-400",
    disputeDeadline: 0,
    disputeReason: "",
    createdAt: Math.floor(Date.now() / 1000) - 2400,
    settledAt: Math.floor(Date.now() / 1000) - 600,
  },
];

export function useSLAs(slaEngine: ethers.Contract | null) {
  const [slas, setSLAs] = useState<SLA[]>(DEMO_SLAS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSLAs = useCallback(async () => {
    if (!slaEngine) {
      setSLAs(DEMO_SLAS);
      return;
    }

    setLoading(true);
    try {
      const total = await slaEngine.totalSLAs();
      const slaList: SLA[] = [];

      for (let i = 1; i <= Number(total); i++) {
        const s = await slaEngine.getAgreement(i);
        const statusInfo = SLA_STATUS_MAP[Number(s.status)] || { label: "Unknown", color: "text-gray-400" };
        slaList.push({
          id: Number(s.slaId),
          clientAgentId: Number(s.clientAgentId),
          providerAgentId: Number(s.providerAgentId),
          clientAgent: `agent-${s.clientAgentId}.init`,
          providerAgent: `agent-${s.providerAgentId}.init`,
          serviceType: s.serviceType,
          inputSpecHash: s.inputSpecHash,
          deliveryDeadline: Number(s.deliveryDeadline),
          payment: ethers.formatEther(s.payment),
          slashPenalty: ethers.formatEther(s.slashPenalty),
          outputHash: s.outputHash,
          outputLocation: s.outputLocation,
          status: Number(s.status),
          statusLabel: statusInfo.label,
          statusColor: statusInfo.color,
          disputeDeadline: Number(s.disputeDeadline),
          disputeReason: s.disputeReason,
          createdAt: Number(s.createdAt),
          settledAt: Number(s.settledAt),
        });
      }

      setSLAs(slaList);
    } catch (err: any) {
      console.error("[useSLAs] Error:", err);
      setError(err.message);
      setSLAs(DEMO_SLAS);
    } finally {
      setLoading(false);
    }
  }, [slaEngine]);

  useEffect(() => {
    fetchSLAs();
  }, [fetchSLAs]);

  return { slas, loading, error, refetch: fetchSLAs };
}
