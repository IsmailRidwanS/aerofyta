/**
 * AeroFyta — WebSocket Hook
 * Real-time event streaming from the agent runtime server.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface WSEvent {
  id: string;
  type: string;
  agent_id?: number;
  agentName?: string;
  action?: string;
  description?: string;
  report?: any;
  output_hash?: string;
  model_id?: string;
  timestamp: string;
  amount?: string;
  txHash?: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

export function useWebSocket() {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
        console.log("[WS] Connected to agent runtime");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;

          const wsEvent: WSEvent = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ...data,
          };
          setEvents((prev) => [wsEvent, ...prev].slice(0, 100)); // Keep last 100 events
        } catch (err) {
          console.error("[WS] Parse error:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("[WS] Disconnected. Reconnecting in 3s...");
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("[WS] Error:", err);
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("ping");
    }
  }, []);

  useEffect(() => {
    connect();
    const pingInterval = setInterval(sendPing, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  return {
    events,
    isConnected,
    connect,
    disconnect,
    clearEvents: () => setEvents([]),
  };
}
