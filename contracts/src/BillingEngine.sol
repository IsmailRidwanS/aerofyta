// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title BillingEngine - Protocol Revenue Collection & Analytics
/// @notice Captures platform fees from SLA settlements and slash events
/// @dev Part of the AeroFyta Protocol - On-chain Operations Layer for Enterprise AI Agents
contract BillingEngine is Ownable {
    // ============ State ============

    uint256 public platformFeeBps = 50; // 0.5% = 50 basis points
    uint256 public constant MAX_FEE_BPS = 500; // 5% maximum

    uint256 public totalFeeRevenue;
    uint256 public totalSlashRevenue;
    uint256 public totalRegistrationRevenue;
    uint256 public totalSLAsSettled;
    uint256 public totalSLAsBreached;

    address public slaEngine;

    // ============ Events ============

    event FeeCollected(uint256 indexed slaId, uint256 paymentAmount, uint256 feeAmount);
    event SlashFeeCollected(uint256 indexed slaId, uint256 slashAmount, uint256 feeAmount);
    event RegistrationFeeCollected(uint256 amount);
    event RevenueWithdrawn(address indexed treasury, uint256 amount);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    // ============ Modifiers ============

    modifier onlySLAEngine() {
        require(msg.sender == slaEngine, "BE: only SLAEngine");
        _;
    }

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {}

    // ============ Admin ============

    function setSLAEngine(address _slaEngine) external onlyOwner {
        require(_slaEngine != address(0), "BE: zero address");
        slaEngine = _slaEngine;
    }

    function updateFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "BE: fee too high");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit FeeUpdated(oldFee, newFeeBps);
    }

    // ============ Fee Calculation ============

    /// @notice Calculate platform fee for a given payment amount
    function calculateFee(uint256 paymentAmount) external view returns (uint256) {
        return (paymentAmount * platformFeeBps) / 10000;
    }

    // ============ Fee Collection (Called by SLAEngine) ============

    /// @notice Collect platform fee from SLA settlement
    function collectFee(uint256 slaId, uint256 paymentAmount) external payable onlySLAEngine {
        uint256 expectedFee = (paymentAmount * platformFeeBps) / 10000;
        require(msg.value >= expectedFee, "BE: insufficient fee");

        totalFeeRevenue += msg.value;
        totalSLAsSettled++;

        emit FeeCollected(slaId, paymentAmount, msg.value);
    }

    /// @notice Collect protocol share of slash penalty
    function collectSlashFee(uint256 slaId, uint256 slashAmount) external payable onlySLAEngine {
        require(msg.value > 0, "BE: zero slash fee");

        totalSlashRevenue += msg.value;
        totalSLAsBreached++;

        emit SlashFeeCollected(slaId, slashAmount, msg.value);
    }

    // ============ Registration Fee (Called by AgentVault via direct transfer) ============

    /// @notice Record registration fee revenue
    function recordRegistrationFee() external payable {
        require(msg.value > 0, "BE: zero fee");
        totalRegistrationRevenue += msg.value;
        emit RegistrationFeeCollected(msg.value);
    }

    // ============ Revenue Management ============

    /// @notice Total protocol revenue across all streams
    function totalRevenue() external view returns (uint256) {
        return totalFeeRevenue + totalSlashRevenue + totalRegistrationRevenue;
    }

    /// @notice Withdraw accumulated revenue to treasury
    function withdrawRevenue(address payable treasury) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "BE: no revenue");
        require(treasury != address(0), "BE: zero treasury");

        (bool sent,) = treasury.call{value: balance}("");
        require(sent, "BE: transfer failed");

        emit RevenueWithdrawn(treasury, balance);
    }

    // ============ Analytics Views ============

    /// @notice Get complete revenue breakdown
    function getRevenueBreakdown()
        external
        view
        returns (
            uint256 feeRevenue,
            uint256 slashRevenue,
            uint256 registrationRevenue,
            uint256 total,
            uint256 slasSettled,
            uint256 slasBreached
        )
    {
        feeRevenue = totalFeeRevenue;
        slashRevenue = totalSlashRevenue;
        registrationRevenue = totalRegistrationRevenue;
        total = totalFeeRevenue + totalSlashRevenue + totalRegistrationRevenue;
        slasSettled = totalSLAsSettled;
        slasBreached = totalSLAsBreached;
    }

    // ============ Receive ============

    receive() external payable {}
}
