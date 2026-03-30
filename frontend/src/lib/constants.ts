// AeroFyta Protocol — Contract Addresses & Configuration
// These will be updated after deployment to aerofyta-1 Minitia

export const CHAIN_CONFIG = {
  chainId: "aerofyta-1",
  chainName: "AeroFyta",
  rpc: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:26657",
  rest: process.env.NEXT_PUBLIC_REST_URL || "http://localhost:1317",
  jsonRpc: process.env.NEXT_PUBLIC_JSON_RPC_URL || "http://localhost:8545",
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://scan.initia.xyz/aerofyta-1",
  gasDenom: "umin",
};

export const CONTRACT_ADDRESSES = {
  agentVault: process.env.NEXT_PUBLIC_AGENT_VAULT || "0x0000000000000000000000000000000000000000",
  slaEngine: process.env.NEXT_PUBLIC_SLA_ENGINE || "0x0000000000000000000000000000000000000000",
  billingEngine: process.env.NEXT_PUBLIC_BILLING_ENGINE || "0x0000000000000000000000000000000000000000",
};

export const PROTOCOL_CONFIG = {
  registrationFee: "25", // INIT
  minimumStake: "50", // INIT
  platformFeeBps: 50, // 0.5%
  defaultSessionDuration: 86400, // 24 hours
  defaultMaxPerTx: "100", // INIT
  disputeWindow: 3600, // 1 hour
};

export const SERVICE_TYPES = [
  { value: "data-analysis", label: "Data Analysis", description: "AI-powered data analysis and insights" },
  { value: "content-gen", label: "Content Generation", description: "AI content creation and copywriting" },
  { value: "code-review", label: "Code Review", description: "Automated code review and security audit" },
  { value: "bridge-exec", label: "Bridge Execution", description: "Cross-chain asset bridging operations" },
  { value: "trading", label: "Trading", description: "Algorithmic trading and market making" },
  { value: "monitoring", label: "Monitoring", description: "On-chain monitoring and alerting" },
];

export const SLA_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "Proposed", color: "text-yellow-400" },
  1: { label: "Active", color: "text-blue-400" },
  2: { label: "Delivered", color: "text-purple-400" },
  3: { label: "Settled", color: "text-green-400" },
  4: { label: "Disputed", color: "text-orange-400" },
  5: { label: "Breached", color: "text-red-400" },
  6: { label: "Expired", color: "text-gray-400" },
  7: { label: "Cancelled", color: "text-gray-500" },
};
