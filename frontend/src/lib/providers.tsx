"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, CHAIN_CONFIG } from "./constants";
import { AGENT_VAULT_ABI, SLA_ENGINE_ABI, BILLING_ENGINE_ABI } from "./contracts";

// ============ Types ============

interface WalletState {
  address: string | null;
  initUsername: string | null;
  isConnected: boolean;
  chainId: string | null;
}

interface ContractState {
  agentVault: ethers.Contract | null;
  slaEngine: ethers.Contract | null;
  billingEngine: ethers.Contract | null;
  signer: ethers.Signer | null;
  provider: ethers.Provider | null;
}

interface AppContextType {
  wallet: WalletState;
  contracts: ContractState;
  connect: () => Promise<void>;
  disconnect: () => void;
  openBridge: () => void;
  isReady: boolean;
}

// ============ Context ============

const AppContext = createContext<AppContextType>({
  wallet: { address: null, initUsername: null, isConnected: false, chainId: null },
  contracts: { agentVault: null, slaEngine: null, billingEngine: null, signer: null, provider: null },
  connect: async () => {},
  disconnect: () => {},
  openBridge: () => {},
  isReady: false,
});

export function useApp() {
  return useContext(AppContext);
}

// ============ Provider ============

export function AppProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    initUsername: null,
    isConnected: false,
    chainId: null,
  });

  const [contracts, setContracts] = useState<ContractState>({
    agentVault: null,
    slaEngine: null,
    billingEngine: null,
    signer: null,
    provider: null,
  });

  const [isReady, setIsReady] = useState(false);

  // Initialize read-only provider on mount
  useEffect(() => {
    try {
      const provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.jsonRpc);
      const agentVault = new ethers.Contract(CONTRACT_ADDRESSES.agentVault, AGENT_VAULT_ABI, provider);
      const slaEngine = new ethers.Contract(CONTRACT_ADDRESSES.slaEngine, SLA_ENGINE_ABI, provider);
      const billingEngine = new ethers.Contract(CONTRACT_ADDRESSES.billingEngine, BILLING_ENGINE_ABI, provider);

      setContracts({ agentVault, slaEngine, billingEngine, signer: null, provider });
      setIsReady(true);
    } catch (err) {
      console.warn("[App] Read-only provider failed, using demo mode:", err);
      setIsReady(true);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        // Fallback: demo connection for development without wallet
        setWallet({
          address: "init1q2w3e4r5t6y7u8i9o0p",
          initUsername: "demo-user",
          isConnected: true,
          chainId: CHAIN_CONFIG.chainId,
        });
        return;
      }

      // Real wallet connection (InterwovenKit in production)
      await ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const agentVault = new ethers.Contract(CONTRACT_ADDRESSES.agentVault, AGENT_VAULT_ABI, signer);
      const slaEngine = new ethers.Contract(CONTRACT_ADDRESSES.slaEngine, SLA_ENGINE_ABI, signer);
      const billingEngine = new ethers.Contract(CONTRACT_ADDRESSES.billingEngine, BILLING_ENGINE_ABI, provider);

      setContracts({ agentVault, slaEngine, billingEngine, signer, provider });

      // Try to resolve .init username
      let initUsername: string | null = null;
      try {
        const agentIds = await agentVault.getAgentsByOwner(address);
        if (agentIds.length > 0) {
          const agent = await agentVault.getAgent(agentIds[0]);
          initUsername = agent.initUsername;
        }
      } catch {
        // No .init username yet
      }

      setWallet({
        address,
        initUsername,
        isConnected: true,
        chainId: CHAIN_CONFIG.chainId,
      });

    } catch (err) {
      console.error("[App] Wallet connection failed:", err);
      // Fallback to demo mode
      setWallet({
        address: "init1q2w3e4r5t6y7u8i9o0p",
        initUsername: "demo-user",
        isConnected: true,
        chainId: CHAIN_CONFIG.chainId,
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      initUsername: null,
      isConnected: false,
      chainId: null,
    });
  }, []);

  const openBridge = useCallback(() => {
    // In production: InterwovenKit openBridge() modal
    // For now: open Initia bridge in new tab
    window.open("https://bridge.testnet.initia.xyz/", "_blank");
  }, []);

  return (
    <AppContext.Provider value={{ wallet, contracts, connect, disconnect, openBridge, isReady }}>
      {children}
    </AppContext.Provider>
  );
}
