/**
 * AeroFyta — On-Chain Event Indexer
 * Subscribes to contract events via JSON-RPC WebSocket and broadcasts to frontend.
 */

import { ethers } from "ethers";

const JSON_RPC_WS = process.env.JSON_RPC_WS || "ws://localhost:8546";
const AGENT_VAULT_ADDRESS = process.env.AGENT_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000";
const SLA_ENGINE_ADDRESS = process.env.SLA_ENGINE_ADDRESS || "0x0000000000000000000000000000000000000000";

// Event signatures to monitor
const EVENTS = {
  AgentRegistered: "AgentRegistered(uint256,address,string,string,uint256)",
  StakeSlashed: "StakeSlashed(uint256,uint256,uint256)",
  SLACreated: "SLACreated(uint256,uint256,uint256,string,uint256,uint256,uint64)",
  SLAAccepted: "SLAAccepted(uint256,uint256)",
  SLADelivered: "SLADelivered(uint256,bytes32,string)",
  SLASettled: "SLASettled(uint256,uint256,uint256)",
  SLABreached: "SLABreached(uint256,uint256,uint256,uint256)",
  AuditEntry: "AuditEntry(uint256,uint256,string,bytes32,string,string,bytes32,uint256,uint256)",
};

interface IndexedEvent {
  type: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  args: Record<string, any>;
}

class EventIndexer {
  private provider: ethers.WebSocketProvider | null = null;
  private eventCallbacks: ((event: IndexedEvent) => void)[] = [];

  constructor() {}

  onEvent(callback: (event: IndexedEvent) => void) {
    this.eventCallbacks.push(callback);
  }

  async start() {
    console.log(`[Indexer] Connecting to ${JSON_RPC_WS}...`);

    try {
      this.provider = new ethers.WebSocketProvider(JSON_RPC_WS);
      console.log("[Indexer] Connected.");

      // Subscribe to AgentVault events
      const vaultTopics = [
        ethers.id(EVENTS.AgentRegistered),
        ethers.id(EVENTS.StakeSlashed),
      ];

      for (const topic of vaultTopics) {
        this.provider.on({ address: AGENT_VAULT_ADDRESS, topics: [topic] }, (log) => {
          this.processLog("AgentVault", log);
        });
      }

      // Subscribe to SLAEngine events
      const slaTopics = [
        ethers.id(EVENTS.SLACreated),
        ethers.id(EVENTS.SLASettled),
        ethers.id(EVENTS.SLABreached),
        ethers.id(EVENTS.AuditEntry),
      ];

      for (const topic of slaTopics) {
        this.provider.on({ address: SLA_ENGINE_ADDRESS, topics: [topic] }, (log) => {
          this.processLog("SLAEngine", log);
        });
      }

      console.log("[Indexer] Listening for events...");
    } catch (err) {
      console.error("[Indexer] Connection failed:", err);
      setTimeout(() => this.start(), 5000);
    }
  }

  private processLog(source: string, log: ethers.Log) {
    const event: IndexedEvent = {
      type: this.getEventName(log.topics[0]),
      contractAddress: log.address,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp: Date.now(),
      args: { raw: log.data, topics: log.topics },
    };

    console.log(`[Indexer] ${source} event: ${event.type} at block ${event.blockNumber}`);

    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }

  private getEventName(topicHash: string): string {
    for (const [name, sig] of Object.entries(EVENTS)) {
      if (ethers.id(sig) === topicHash) return name;
    }
    return "Unknown";
  }

  async stop() {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
    }
  }
}

// Main
async function main() {
  const indexer = new EventIndexer();

  indexer.onEvent((event) => {
    // In production: push to Redis pub/sub for WebSocket fan-out
    console.log(JSON.stringify(event, null, 2));
  });

  await indexer.start();

  // Keep process alive
  process.on("SIGINT", async () => {
    console.log("[Indexer] Shutting down...");
    await indexer.stop();
    process.exit(0);
  });
}

main().catch(console.error);
