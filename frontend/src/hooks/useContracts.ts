/**
 * AeroFyta — Contract Interaction Hook
 * Provides typed access to all protocol contracts via ethers.js v6.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from "@/lib/constants";
import { AGENT_VAULT_ABI, SLA_ENGINE_ABI, BILLING_ENGINE_ABI } from "@/lib/contracts";

export interface ContractClients {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  agentVault: ethers.Contract | null;
  slaEngine: ethers.Contract | null;
  billingEngine: ethers.Contract | null;
  isConnected: boolean;
}

export function useContracts(): ContractClients & {
  connect: () => Promise<void>;
  disconnect: () => void;
} {
  const [clients, setClients] = useState<ContractClients>({
    provider: null,
    signer: null,
    agentVault: null,
    slaEngine: null,
    billingEngine: null,
    isConnected: false,
  });

  const connect = useCallback(async () => {
    try {
      // Check for browser wallet (MetaMask / Initia Wallet)
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        console.warn("[Contracts] No wallet detected. Using read-only provider.");
        const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.jsonRpc);
        setClients({
          provider,
          signer: null,
          agentVault: new ethers.Contract(CONTRACT_ADDRESSES.agentVault, AGENT_VAULT_ABI, provider),
          slaEngine: new ethers.Contract(CONTRACT_ADDRESSES.slaEngine, SLA_ENGINE_ABI, provider),
          billingEngine: new ethers.Contract(CONTRACT_ADDRESSES.billingEngine, BILLING_ENGINE_ABI, provider),
          isConnected: false,
        });
        return;
      }

      await ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      setClients({
        provider,
        signer,
        agentVault: new ethers.Contract(CONTRACT_ADDRESSES.agentVault, AGENT_VAULT_ABI, signer),
        slaEngine: new ethers.Contract(CONTRACT_ADDRESSES.slaEngine, SLA_ENGINE_ABI, signer),
        billingEngine: new ethers.Contract(CONTRACT_ADDRESSES.billingEngine, BILLING_ENGINE_ABI, provider),
        isConnected: true,
      });

      console.log("[Contracts] Connected to", await signer.getAddress());
    } catch (err) {
      console.error("[Contracts] Connection failed:", err);
    }
  }, []);

  const disconnect = useCallback(() => {
    setClients({
      provider: null,
      signer: null,
      agentVault: null,
      slaEngine: null,
      billingEngine: null,
      isConnected: false,
    });
  }, []);

  return { ...clients, connect, disconnect };
}
