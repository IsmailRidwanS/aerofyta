// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentVault - Identity, Treasury & Staking for AI Agents
/// @notice Manages agent registration, staking, Ghost Wallet sessions, and earnings
/// @dev Part of the AeroFyta Protocol - On-chain Operations Layer for Enterprise AI Agents
contract AgentVault is ReentrancyGuard, Ownable {
    // ============ Structs ============

    struct Agent {
        address owner;
        string initUsername;
        string serviceType;
        string description;
        uint256 stake;
        uint256 earnings;
        uint256 activeSLAs;
        address ghostWallet;
        uint64 sessionExpiry;
        uint256 maxPerTx;
        bool isActive;
        uint256 registeredAt;
    }

    // ============ State ============

    uint256 public nextAgentId = 1;
    uint256 public registrationFee;
    uint256 public minimumStake;

    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) private _ownerAgents;
    mapping(string => uint256) public usernameToId;

    address public slaEngine;

    // ============ Events ============

    event AgentRegistered(
        uint256 indexed agentId, address indexed owner, string initUsername, string serviceType, uint256 stake
    );
    event StakeAdded(uint256 indexed agentId, uint256 amount, uint256 newTotal);
    event StakeWithdrawn(uint256 indexed agentId, uint256 amount, uint256 newTotal);
    event StakeSlashed(uint256 indexed agentId, uint256 amount, uint256 remaining);
    event EarningsDeposited(uint256 indexed agentId, uint256 amount, uint256 newTotal);
    event EarningsWithdrawn(uint256 indexed agentId, uint256 amount, uint256 remaining);
    event SessionGranted(uint256 indexed agentId, address ghostWallet, uint64 expiry, uint256 maxPerTx);
    event SessionRevoked(uint256 indexed agentId);
    event AgentPaused(uint256 indexed agentId);
    event AgentResumed(uint256 indexed agentId);
    event AgentDeregistered(uint256 indexed agentId, uint256 refundedStake, uint256 refundedEarnings);

    // ============ Modifiers ============

    modifier onlyAgentOwner(uint256 agentId) {
        require(agents[agentId].owner == msg.sender, "AV: not agent owner");
        _;
    }

    modifier onlySLAEngine() {
        require(msg.sender == slaEngine, "AV: only SLAEngine");
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(agents[agentId].owner != address(0), "AV: agent not found");
        _;
    }

    // ============ Constructor ============

    constructor(uint256 _registrationFee, uint256 _minimumStake) Ownable(msg.sender) {
        registrationFee = _registrationFee;
        minimumStake = _minimumStake;
    }

    // ============ Admin ============

    function setSLAEngine(address _slaEngine) external onlyOwner {
        require(_slaEngine != address(0), "AV: zero address");
        slaEngine = _slaEngine;
    }

    function updateFees(uint256 _registrationFee, uint256 _minimumStake) external onlyOwner {
        registrationFee = _registrationFee;
        minimumStake = _minimumStake;
    }

    // ============ Registration ============

    /// @notice Register a new AI agent. msg.value = registrationFee + stake (>= minimumStake)
    function registerAgent(
        string calldata initUsername,
        string calldata serviceType,
        string calldata description
    ) external payable nonReentrant returns (uint256 agentId) {
        require(bytes(initUsername).length > 0, "AV: empty username");
        require(bytes(serviceType).length > 0, "AV: empty service type");
        require(usernameToId[initUsername] == 0, "AV: username taken");
        require(msg.value >= registrationFee + minimumStake, "AV: insufficient deposit");

        uint256 stakeAmount = msg.value - registrationFee;

        agentId = nextAgentId++;

        agents[agentId] = Agent({
            owner: msg.sender,
            initUsername: initUsername,
            serviceType: serviceType,
            description: description,
            stake: stakeAmount,
            earnings: 0,
            activeSLAs: 0,
            ghostWallet: address(0),
            sessionExpiry: 0,
            maxPerTx: 0,
            isActive: true,
            registeredAt: block.timestamp
        });

        _ownerAgents[msg.sender].push(agentId);
        usernameToId[initUsername] = agentId;

        emit AgentRegistered(agentId, msg.sender, initUsername, serviceType, stakeAmount);
    }

    // ============ Staking ============

    function addStake(uint256 agentId) external payable agentExists(agentId) onlyAgentOwner(agentId) {
        require(msg.value > 0, "AV: zero stake");
        agents[agentId].stake += msg.value;
        emit StakeAdded(agentId, msg.value, agents[agentId].stake);
    }

    function withdrawStake(uint256 agentId, uint256 amount)
        external
        nonReentrant
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        Agent storage a = agents[agentId];
        require(a.activeSLAs == 0, "AV: active SLAs exist");
        require(a.stake >= amount, "AV: insufficient stake");

        a.stake -= amount;
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "AV: transfer failed");

        emit StakeWithdrawn(agentId, amount, a.stake);
    }

    // ============ Earnings ============

    function withdrawEarnings(uint256 agentId, uint256 amount)
        external
        nonReentrant
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        Agent storage a = agents[agentId];
        require(a.earnings >= amount, "AV: insufficient earnings");

        a.earnings -= amount;
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "AV: transfer failed");

        emit EarningsWithdrawn(agentId, amount, a.earnings);
    }

    // ============ Ghost Wallet Sessions ============

    function grantSession(uint256 agentId, address ghostWallet, uint64 duration, uint256 maxPerTx)
        external
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        require(ghostWallet != address(0), "AV: zero ghost wallet");
        require(duration > 0, "AV: zero duration");
        require(maxPerTx > 0, "AV: zero maxPerTx");

        Agent storage a = agents[agentId];
        a.ghostWallet = ghostWallet;
        a.sessionExpiry = uint64(block.timestamp) + duration;
        a.maxPerTx = maxPerTx;

        emit SessionGranted(agentId, ghostWallet, a.sessionExpiry, maxPerTx);
    }

    function revokeSession(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        Agent storage a = agents[agentId];
        a.ghostWallet = address(0);
        a.sessionExpiry = 0;
        a.maxPerTx = 0;

        emit SessionRevoked(agentId);
    }

    // ============ Lifecycle ============

    function pauseAgent(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        agents[agentId].isActive = false;
        emit AgentPaused(agentId);
    }

    function resumeAgent(uint256 agentId) external agentExists(agentId) onlyAgentOwner(agentId) {
        agents[agentId].isActive = true;
        emit AgentResumed(agentId);
    }

    function deregisterAgent(uint256 agentId)
        external
        nonReentrant
        agentExists(agentId)
        onlyAgentOwner(agentId)
    {
        Agent storage a = agents[agentId];
        require(a.activeSLAs == 0, "AV: active SLAs exist");

        uint256 refund = a.stake + a.earnings;
        a.stake = 0;
        a.earnings = 0;
        a.isActive = false;
        a.ghostWallet = address(0);
        a.sessionExpiry = 0;

        if (refund > 0) {
            (bool sent,) = payable(msg.sender).call{value: refund}("");
            require(sent, "AV: transfer failed");
        }

        emit AgentDeregistered(agentId, a.stake, a.earnings);
    }

    // ============ SLAEngine-Only Functions ============

    function incrementActiveSLAs(uint256 agentId) external onlySLAEngine agentExists(agentId) {
        agents[agentId].activeSLAs++;
    }

    function decrementActiveSLAs(uint256 agentId) external onlySLAEngine agentExists(agentId) {
        if (agents[agentId].activeSLAs > 0) {
            agents[agentId].activeSLAs--;
        }
    }

    function depositEarnings(uint256 agentId) external payable onlySLAEngine agentExists(agentId) {
        require(msg.value > 0, "AV: zero deposit");
        agents[agentId].earnings += msg.value;
        emit EarningsDeposited(agentId, msg.value, agents[agentId].earnings);
    }

    function slashStake(uint256 agentId, uint256 amount)
        external
        onlySLAEngine
        agentExists(agentId)
        returns (uint256 slashed)
    {
        Agent storage a = agents[agentId];
        slashed = amount > a.stake ? a.stake : amount;
        a.stake -= slashed;

        // Transfer slashed funds to SLAEngine for redistribution
        if (slashed > 0) {
            (bool sent,) = msg.sender.call{value: slashed}("");
            require(sent, "AV: slash transfer failed");
        }

        emit StakeSlashed(agentId, slashed, a.stake);
    }

    // ============ View Functions ============

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerAgents[owner];
    }

    function isSessionValid(uint256 agentId, address caller) external view returns (bool) {
        Agent memory a = agents[agentId];
        return a.ghostWallet == caller && block.timestamp < a.sessionExpiry && a.isActive;
    }

    function totalAgents() external view returns (uint256) {
        return nextAgentId - 1;
    }

    /// @notice Get all active provider agents (for discovery)
    function getActiveAgents(uint256 offset, uint256 limit)
        external
        view
        returns (Agent[] memory result, uint256 total)
    {
        total = 0;

        // First pass: count active agents
        for (uint256 i = 1; i < nextAgentId; i++) {
            if (agents[i].isActive) total++;
        }

        if (offset >= total) {
            return (new Agent[](0), total);
        }

        uint256 resultSize = limit;
        if (offset + limit > total) resultSize = total - offset;
        result = new Agent[](resultSize);

        uint256 found = 0;
        uint256 idx = 0;
        for (uint256 i = 1; i < nextAgentId && idx < resultSize; i++) {
            if (agents[i].isActive) {
                if (found >= offset) {
                    result[idx] = agents[i];
                    idx++;
                }
                found++;
            }
        }
    }

    // ============ Receive ============

    receive() external payable {}
}
