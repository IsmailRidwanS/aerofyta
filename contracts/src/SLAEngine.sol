// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SLAEngine - Self-Enforcing Service Level Agreements for AI Agents
/// @notice Core innovation: on-chain SLAs with escrowed payments, staking, slashing, and audit trails
/// @dev Part of the AeroFyta Protocol - On-chain Operations Layer for Enterprise AI Agents
contract SLAEngine is ReentrancyGuard, Ownable {
    // ============ Interfaces ============

    IAgentVault public vault;
    IBillingEngine public billing;

    // ============ Enums ============

    enum Status {
        Proposed,
        Active,
        Delivered,
        Settled,
        Disputed,
        Breached,
        Expired,
        Cancelled
    }

    // ============ Structs ============

    struct SLA {
        uint256 slaId;
        uint256 clientAgentId;
        uint256 providerAgentId;
        string serviceType;
        bytes32 inputSpecHash;
        uint64 deliveryDeadline;
        uint256 payment;
        uint256 slashPenalty;
        bytes32 outputHash;
        string outputLocation;
        Status status;
        uint64 disputeDeadline;
        string disputeReason;
        uint256 createdAt;
        uint256 settledAt;
    }

    // ============ State ============

    uint256 public nextSLAId = 1;
    uint64 public disputeWindow = 3600; // 1 hour default

    mapping(uint256 => SLA) public slas;
    mapping(uint256 => uint256[]) private _agentSLAs;

    // ============ Events ============

    event SLACreated(
        uint256 indexed slaId,
        uint256 indexed clientAgentId,
        uint256 indexed providerAgentId,
        string serviceType,
        uint256 payment,
        uint256 slashPenalty,
        uint64 deliveryDeadline
    );
    event SLAAccepted(uint256 indexed slaId, uint256 indexed providerAgentId);
    event SLADelivered(uint256 indexed slaId, bytes32 outputHash, string outputLocation);
    event SLASettled(uint256 indexed slaId, uint256 providerPayout, uint256 platformFee);
    event SLABreached(uint256 indexed slaId, uint256 slashedAmount, uint256 clientRefund, uint256 protocolShare);
    event SLADisputed(uint256 indexed slaId, string reason, uint64 disputeDeadline);
    event SLACancelled(uint256 indexed slaId);

    /// @notice Tamper-proof audit trail event — replaces separate AuditLedger contract
    /// @dev Emitted on every state transition. Indexed for efficient off-chain querying.
    event AuditEntry(
        uint256 indexed agentId,
        uint256 indexed slaId,
        string actionType,
        bytes32 inputHash,
        string modelId,
        string modelVersion,
        bytes32 outputHash,
        uint256 timestamp,
        uint256 blockNumber
    );

    // ============ Constructor ============

    constructor(address _vault, address _billing) Ownable(msg.sender) {
        require(_vault != address(0) && _billing != address(0), "SLA: zero address");
        vault = IAgentVault(_vault);
        billing = IBillingEngine(_billing);
    }

    // ============ Admin ============

    function updateDisputeWindow(uint64 _window) external onlyOwner {
        require(_window >= 300, "SLA: min 5 minutes");
        require(_window <= 86400, "SLA: max 24 hours");
        disputeWindow = _window;
    }

    // ============ SLA Lifecycle ============

    /// @notice Client creates an SLA proposal with escrowed payment
    /// @param clientAgentId The client agent's ID
    /// @param providerAgentId The provider agent's ID
    /// @param serviceType Type of service requested
    /// @param inputSpecHash SHA-256 hash of the task specification
    /// @param deliveryDeadline Unix timestamp for delivery
    /// @param slashPenalty Amount to slash from provider's stake on breach
    function createAgreement(
        uint256 clientAgentId,
        uint256 providerAgentId,
        string calldata serviceType,
        bytes32 inputSpecHash,
        uint64 deliveryDeadline,
        uint256 slashPenalty
    ) external payable nonReentrant returns (uint256 slaId) {
        require(msg.value > 0, "SLA: payment required");
        require(deliveryDeadline > block.timestamp, "SLA: deadline in past");
        require(clientAgentId != providerAgentId, "SLA: cannot self-contract");
        require(bytes(serviceType).length > 0, "SLA: empty service type");

        slaId = nextSLAId++;

        slas[slaId] = SLA({
            slaId: slaId,
            clientAgentId: clientAgentId,
            providerAgentId: providerAgentId,
            serviceType: serviceType,
            inputSpecHash: inputSpecHash,
            deliveryDeadline: deliveryDeadline,
            payment: msg.value,
            slashPenalty: slashPenalty,
            outputHash: bytes32(0),
            outputLocation: "",
            status: Status.Proposed,
            disputeDeadline: 0,
            disputeReason: "",
            createdAt: block.timestamp,
            settledAt: 0
        });

        _agentSLAs[clientAgentId].push(slaId);
        _agentSLAs[providerAgentId].push(slaId);

        emit SLACreated(slaId, clientAgentId, providerAgentId, serviceType, msg.value, slashPenalty, deliveryDeadline);

        _emitAudit(clientAgentId, slaId, "create", inputSpecHash, "", "", bytes32(0));
    }

    /// @notice Provider accepts the SLA — locks both parties into the agreement
    function acceptAgreement(uint256 slaId) external nonReentrant {
        SLA storage s = slas[slaId];
        require(s.status == Status.Proposed, "SLA: not proposed");

        s.status = Status.Active;

        vault.incrementActiveSLAs(s.clientAgentId);
        vault.incrementActiveSLAs(s.providerAgentId);

        emit SLAAccepted(slaId, s.providerAgentId);
        _emitAudit(s.providerAgentId, slaId, "accept", bytes32(0), "", "", bytes32(0));
    }

    /// @notice Provider delivers work with output proof and AI model attribution
    /// @param slaId The SLA to deliver against
    /// @param outputHash SHA-256 hash of the output
    /// @param outputLocation IPFS/Arweave URI for the encrypted output
    /// @param modelId AI model used (e.g., "claude-sonnet-4")
    /// @param modelVersion Model version (e.g., "20250514")
    function deliver(
        uint256 slaId,
        bytes32 outputHash,
        string calldata outputLocation,
        string calldata modelId,
        string calldata modelVersion
    ) external {
        SLA storage s = slas[slaId];
        require(s.status == Status.Active || s.status == Status.Disputed, "SLA: cannot deliver");
        require(block.timestamp <= s.deliveryDeadline, "SLA: past deadline");
        require(outputHash != bytes32(0), "SLA: empty output hash");

        s.outputHash = outputHash;
        s.outputLocation = outputLocation;
        s.status = Status.Delivered;

        emit SLADelivered(slaId, outputHash, outputLocation);
        _emitAudit(s.providerAgentId, slaId, "deliver", s.inputSpecHash, modelId, modelVersion, outputHash);
    }

    /// @notice Client confirms delivery and releases payment
    function settle(uint256 slaId) external nonReentrant {
        SLA storage s = slas[slaId];
        require(s.status == Status.Delivered, "SLA: not delivered");

        s.status = Status.Settled;
        s.settledAt = block.timestamp;

        // Calculate platform fee
        uint256 fee = billing.calculateFee(s.payment);
        uint256 providerPayout = s.payment - fee;

        // Pay provider earnings
        vault.depositEarnings{value: providerPayout}(s.providerAgentId);

        // Pay protocol fee
        billing.collectFee{value: fee}(slaId, s.payment);

        // Decrement active SLA counts
        vault.decrementActiveSLAs(s.clientAgentId);
        vault.decrementActiveSLAs(s.providerAgentId);

        emit SLASettled(slaId, providerPayout, fee);
        _emitAudit(s.clientAgentId, slaId, "settle", bytes32(0), "", "", bytes32(0));
    }

    /// @notice Client disputes delivery — provider has disputeWindow to re-deliver
    function disputeDelivery(uint256 slaId, string calldata reason) external {
        SLA storage s = slas[slaId];
        require(s.status == Status.Delivered, "SLA: not delivered");
        require(bytes(reason).length > 0, "SLA: empty reason");

        s.status = Status.Disputed;
        s.disputeReason = reason;
        s.disputeDeadline = uint64(block.timestamp) + disputeWindow;

        // Reset output so provider must re-deliver
        s.outputHash = bytes32(0);
        s.outputLocation = "";

        emit SLADisputed(slaId, reason, s.disputeDeadline);
        _emitAudit(s.clientAgentId, slaId, "dispute", bytes32(0), "", "", bytes32(0));
    }

    /// @notice Claim breach after deadline or dispute timeout — slashes provider, refunds client
    /// @dev Callable by anyone — permissionless enforcement
    function claimBreach(uint256 slaId) external nonReentrant {
        SLA storage s = slas[slaId];

        bool deadlinePassed = (s.status == Status.Active && block.timestamp > s.deliveryDeadline);
        bool disputeExpired = (s.status == Status.Disputed && block.timestamp > s.disputeDeadline);

        require(deadlinePassed || disputeExpired, "SLA: cannot breach yet");

        s.status = Status.Breached;
        s.settledAt = block.timestamp;

        // Slash provider stake
        uint256 slashed = vault.slashStake(s.providerAgentId, s.slashPenalty);

        // Distribute: 80% to client, 20% to protocol
        uint256 clientShare = (slashed * 80) / 100;
        uint256 protocolShare = slashed - clientShare;

        // Refund escrowed payment + client's share of slash
        uint256 clientTotal = s.payment + clientShare;
        vault.depositEarnings{value: clientTotal}(s.clientAgentId);

        // Protocol keeps 20% of slash
        if (protocolShare > 0) {
            billing.collectSlashFee{value: protocolShare}(slaId, slashed);
        }

        // Decrement active SLA counts
        vault.decrementActiveSLAs(s.clientAgentId);
        vault.decrementActiveSLAs(s.providerAgentId);

        emit SLABreached(slaId, slashed, clientTotal, protocolShare);
        _emitAudit(s.providerAgentId, slaId, "breach", bytes32(0), "", "", bytes32(0));
    }

    /// @notice Cancel a proposed SLA before it's accepted — refunds client
    function cancelAgreement(uint256 slaId) external nonReentrant {
        SLA storage s = slas[slaId];
        require(s.status == Status.Proposed, "SLA: not proposed");

        s.status = Status.Cancelled;

        // Refund payment to client
        vault.depositEarnings{value: s.payment}(s.clientAgentId);

        emit SLACancelled(slaId);
        _emitAudit(s.clientAgentId, slaId, "cancel", bytes32(0), "", "", bytes32(0));
    }

    // ============ Internal ============

    function _emitAudit(
        uint256 agentId,
        uint256 slaId,
        string memory actionType,
        bytes32 inputHash,
        string memory modelId,
        string memory modelVersion,
        bytes32 outputHash
    ) internal {
        emit AuditEntry(agentId, slaId, actionType, inputHash, modelId, modelVersion, outputHash, block.timestamp, block.number);
    }

    // ============ View Functions ============

    function getAgreement(uint256 slaId) external view returns (SLA memory) {
        return slas[slaId];
    }

    function getAgentSLAs(uint256 agentId) external view returns (uint256[] memory) {
        return _agentSLAs[agentId];
    }

    function totalSLAs() external view returns (uint256) {
        return nextSLAId - 1;
    }

    function getSLAsByStatus(uint256 agentId, Status status)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory all = _agentSLAs[agentId];
        uint256 count = 0;

        for (uint256 i = 0; i < all.length; i++) {
            if (slas[all[i]].status == status) count++;
        }

        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (slas[all[i]].status == status) {
                result[idx++] = all[i];
            }
        }
        return result;
    }

    // ============ Receive ============

    receive() external payable {}
}

// ============ Interfaces ============

interface IAgentVault {
    function incrementActiveSLAs(uint256 agentId) external;
    function decrementActiveSLAs(uint256 agentId) external;
    function depositEarnings(uint256 agentId) external payable;
    function slashStake(uint256 agentId, uint256 amount) external returns (uint256);
}

interface IBillingEngine {
    function calculateFee(uint256 paymentAmount) external view returns (uint256);
    function collectFee(uint256 slaId, uint256 paymentAmount) external payable;
    function collectSlashFee(uint256 slaId, uint256 slashAmount) external payable;
}
