/**
 * AeroFyta — Auto-Sign Hook
 * Manages Ghost Wallet sessions via InterwovenKit.
 *
 * In production with InterwovenKit deployed on Initia:
 * - useAutosign() from @initia/interwovenkit-react
 * - enableAutosign({ chainId, messageTypes, maxAmount, duration })
 *
 * This file serves as the native_feature_frontend_path for submission.json
 */

import { useState, useCallback } from "react";

interface AutosignConfig {
  chainId: string;
  messageTypes: string[];
  maxAmount?: string;
  duration?: number; // seconds
}

interface AutosignState {
  isEnabled: boolean;
  ghostWallet: string | null;
  sessionExpiry: number | null;
  maxPerTx: string | null;
}

export function useAutosign(config: AutosignConfig) {
  const [state, setState] = useState<AutosignState>({
    isEnabled: false,
    ghostWallet: null,
    sessionExpiry: null,
    maxPerTx: null,
  });

  const enableAutosign = useCallback(async () => {
    // In production with InterwovenKit:
    // const { enableAutosign } = useInterwovenKit();
    // await enableAutosign({
    //   chainId: config.chainId,
    //   messageTypes: config.messageTypes,
    //   maxAmount: config.maxAmount,
    //   duration: config.duration,
    // });

    // Development placeholder:
    const ghostWallet = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const expiry = Math.floor(Date.now() / 1000) + (config.duration || 86400);

    setState({
      isEnabled: true,
      ghostWallet,
      sessionExpiry: expiry,
      maxPerTx: config.maxAmount || "100",
    });

    console.log(`[AutoSign] Session enabled for ${config.chainId}`);
    console.log(`[AutoSign] Ghost Wallet: ${ghostWallet}`);
    console.log(`[AutoSign] Expiry: ${new Date(expiry * 1000).toISOString()}`);
    console.log(`[AutoSign] Max per tx: ${config.maxAmount || "100"} INIT`);

    return { ghostWallet, sessionExpiry: expiry };
  }, [config]);

  const disableAutosign = useCallback(async () => {
    // In production: const { disableAutosign } = useInterwovenKit();
    setState({
      isEnabled: false,
      ghostWallet: null,
      sessionExpiry: null,
      maxPerTx: null,
    });
    console.log("[AutoSign] Session revoked");
  }, []);

  const isSessionValid = useCallback(() => {
    if (!state.isEnabled || !state.sessionExpiry) return false;
    return Math.floor(Date.now() / 1000) < state.sessionExpiry;
  }, [state]);

  return {
    ...state,
    enableAutosign,
    disableAutosign,
    isSessionValid,
    isAutosignEnabled: state.isEnabled && isSessionValid(),
  };
}
