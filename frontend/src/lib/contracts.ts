// AeroFyta Protocol — Contract ABIs (minimal interfaces for frontend)

export const AGENT_VAULT_ABI = [
  // Registration
  "function registerAgent(string initUsername, string serviceType, string description) payable returns (uint256)",
  "function addStake(uint256 agentId) payable",
  "function withdrawStake(uint256 agentId, uint256 amount)",
  "function withdrawEarnings(uint256 agentId, uint256 amount)",

  // Ghost Wallet
  "function grantSession(uint256 agentId, address ghostWallet, uint64 duration, uint256 maxPerTx)",
  "function revokeSession(uint256 agentId)",

  // Lifecycle
  "function pauseAgent(uint256 agentId)",
  "function resumeAgent(uint256 agentId)",
  "function deregisterAgent(uint256 agentId)",

  // Views
  "function getAgent(uint256 agentId) view returns (tuple(address owner, string initUsername, string serviceType, string description, uint256 stake, uint256 earnings, uint256 activeSLAs, address ghostWallet, uint64 sessionExpiry, uint256 maxPerTx, bool isActive, uint256 registeredAt))",
  "function getAgentsByOwner(address owner) view returns (uint256[])",
  "function getActiveAgents(uint256 offset, uint256 limit) view returns (tuple(address owner, string initUsername, string serviceType, string description, uint256 stake, uint256 earnings, uint256 activeSLAs, address ghostWallet, uint64 sessionExpiry, uint256 maxPerTx, bool isActive, uint256 registeredAt)[], uint256)",
  "function usernameToId(string) view returns (uint256)",
  "function totalAgents() view returns (uint256)",
  "function isSessionValid(uint256 agentId, address caller) view returns (bool)",
  "function registrationFee() view returns (uint256)",
  "function minimumStake() view returns (uint256)",

  // Events
  "event AgentRegistered(uint256 indexed agentId, address indexed owner, string initUsername, string serviceType, uint256 stake)",
  "event StakeSlashed(uint256 indexed agentId, uint256 amount, uint256 remaining)",
  "event EarningsDeposited(uint256 indexed agentId, uint256 amount, uint256 newTotal)",
  "event SessionGranted(uint256 indexed agentId, address ghostWallet, uint64 expiry, uint256 maxPerTx)",
  "event AgentPaused(uint256 indexed agentId)",
  "event AgentResumed(uint256 indexed agentId)",
] as const;

export const SLA_ENGINE_ABI = [
  // SLA Lifecycle
  "function createAgreement(uint256 clientAgentId, uint256 providerAgentId, string serviceType, bytes32 inputSpecHash, uint64 deliveryDeadline, uint256 slashPenalty) payable returns (uint256)",
  "function acceptAgreement(uint256 slaId)",
  "function deliver(uint256 slaId, bytes32 outputHash, string outputLocation, string modelId, string modelVersion)",
  "function settle(uint256 slaId)",
  "function disputeDelivery(uint256 slaId, string reason)",
  "function claimBreach(uint256 slaId)",
  "function cancelAgreement(uint256 slaId)",

  // Views
  "function getAgreement(uint256 slaId) view returns (tuple(uint256 slaId, uint256 clientAgentId, uint256 providerAgentId, string serviceType, bytes32 inputSpecHash, uint64 deliveryDeadline, uint256 payment, uint256 slashPenalty, bytes32 outputHash, string outputLocation, uint8 status, uint64 disputeDeadline, string disputeReason, uint256 createdAt, uint256 settledAt))",
  "function getAgentSLAs(uint256 agentId) view returns (uint256[])",
  "function totalSLAs() view returns (uint256)",

  // Events
  "event SLACreated(uint256 indexed slaId, uint256 indexed clientAgentId, uint256 indexed providerAgentId, string serviceType, uint256 payment, uint256 slashPenalty, uint64 deliveryDeadline)",
  "event SLAAccepted(uint256 indexed slaId, uint256 indexed providerAgentId)",
  "event SLADelivered(uint256 indexed slaId, bytes32 outputHash, string outputLocation)",
  "event SLASettled(uint256 indexed slaId, uint256 providerPayout, uint256 platformFee)",
  "event SLABreached(uint256 indexed slaId, uint256 slashedAmount, uint256 clientRefund, uint256 protocolShare)",
  "event SLADisputed(uint256 indexed slaId, string reason, uint64 disputeDeadline)",
  "event AuditEntry(uint256 indexed agentId, uint256 indexed slaId, string actionType, bytes32 inputHash, string modelId, string modelVersion, bytes32 outputHash, uint256 timestamp, uint256 blockNumber)",
] as const;

export const BILLING_ENGINE_ABI = [
  // Views
  "function totalRevenue() view returns (uint256)",
  "function totalFeeRevenue() view returns (uint256)",
  "function totalSlashRevenue() view returns (uint256)",
  "function totalRegistrationRevenue() view returns (uint256)",
  "function totalSLAsSettled() view returns (uint256)",
  "function totalSLAsBreached() view returns (uint256)",
  "function platformFeeBps() view returns (uint256)",
  "function getRevenueBreakdown() view returns (uint256 feeRevenue, uint256 slashRevenue, uint256 registrationRevenue, uint256 total, uint256 slasSettled, uint256 slasBreached)",

  // Events
  "event FeeCollected(uint256 indexed slaId, uint256 paymentAmount, uint256 feeAmount)",
  "event SlashFeeCollected(uint256 indexed slaId, uint256 slashAmount, uint256 feeAmount)",
] as const;
