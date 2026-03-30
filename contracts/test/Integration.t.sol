// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentVault.sol";
import "../src/SLAEngine.sol";
import "../src/BillingEngine.sol";

/// @title Integration Tests — Full SLA Lifecycle
/// @notice Tests the complete AeroFyta protocol end-to-end
contract IntegrationTest is Test {
    AgentVault public vault;
    SLAEngine public sla;
    BillingEngine public billing;

    address public owner = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public aliceGhost = address(0xA1);
    address public bobGhost = address(0xB1);

    uint256 public constant REG_FEE = 25 ether;
    uint256 public constant MIN_STAKE = 50 ether;

    function setUp() public {
        // Deploy contracts
        vault = new AgentVault(REG_FEE, MIN_STAKE);
        billing = new BillingEngine();
        sla = new SLAEngine(address(vault), address(billing));

        // Wire contracts together
        vault.setSLAEngine(address(sla));
        billing.setSLAEngine(address(sla));

        // Fund test accounts
        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
    }

    // ========== Helper Functions ==========

    function _registerAliceProvider() internal returns (uint256 agentId) {
        vm.prank(alice);
        agentId = vault.registerAgent{value: REG_FEE + 200 ether}(
            "alice-analyst",
            "data-analysis",
            "AI data analyst powered by Claude"
        );
        vm.prank(alice);
        vault.grantSession(agentId, aliceGhost, 86400, 100 ether);
    }

    function _registerBobBuyer() internal returns (uint256 agentId) {
        vm.prank(bob);
        agentId = vault.registerAgent{value: REG_FEE + 100 ether}(
            "bob-buyer",
            "procurement",
            "Procurement agent"
        );
        vm.prank(bob);
        vault.grantSession(agentId, bobGhost, 86400, 100 ether);
    }

    // ========== Test: Full Happy Path ==========

    function test_FullSLALifecycle_HappyPath() public {
        // 1. Register agents
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        // Verify registration
        AgentVault.Agent memory aliceAgent = vault.getAgent(aliceId);
        assertEq(aliceAgent.stake, 200 ether);
        assertEq(keccak256(bytes(aliceAgent.initUsername)), keccak256(bytes("alice-analyst")));
        assertTrue(aliceAgent.isActive);

        // 2. Bob creates SLA with escrowed payment
        vm.prank(bob);
        uint256 slaId = sla.createAgreement{value: 30 ether}(
            bobId,
            aliceId,
            "data-analysis",
            keccak256("analyze InitiaDEX pools"),
            uint64(block.timestamp + 3600),
            15 ether // slash penalty
        );

        // Verify SLA created
        SLAEngine.SLA memory agreement = sla.getAgreement(slaId);
        assertEq(agreement.payment, 30 ether);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Proposed));

        // 3. Alice accepts
        vm.prank(alice);
        sla.acceptAgreement(slaId);

        agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Active));

        // Both agents should have 1 active SLA
        assertEq(vault.getAgent(aliceId).activeSLAs, 1);
        assertEq(vault.getAgent(bobId).activeSLAs, 1);

        // 4. Alice delivers
        bytes32 outputHash = keccak256("analysis report output");
        vm.prank(alice);
        sla.deliver(slaId, outputHash, "ipfs://QmReport123", "claude-sonnet-4", "20250514");

        agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Delivered));
        assertEq(agreement.outputHash, outputHash);

        // 5. Bob settles
        uint256 aliceEarningsBefore = vault.getAgent(aliceId).earnings;
        vm.prank(bob);
        sla.settle(slaId);

        agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Settled));

        // Verify payment distribution
        // Platform fee = 0.5% of 30 ether = 0.15 ether
        uint256 expectedFee = (30 ether * 50) / 10000;
        uint256 expectedPayout = 30 ether - expectedFee;

        assertEq(vault.getAgent(aliceId).earnings, aliceEarningsBefore + expectedPayout);
        assertEq(billing.totalFeeRevenue(), expectedFee);
        assertEq(billing.totalSLAsSettled(), 1);

        // Active SLAs should be back to 0
        assertEq(vault.getAgent(aliceId).activeSLAs, 0);
        assertEq(vault.getAgent(bobId).activeSLAs, 0);
    }

    // ========== Test: Breach + Slash ==========

    function test_BreachFlow_DeadlinePassed() public {
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        uint256 aliceStakeBefore = vault.getAgent(aliceId).stake;

        // Bob creates SLA with short deadline
        vm.prank(bob);
        uint256 slaId = sla.createAgreement{value: 30 ether}(
            bobId,
            aliceId,
            "data-analysis",
            keccak256("analyze pools"),
            uint64(block.timestamp + 300), // 5 minute deadline
            15 ether
        );

        // Alice accepts
        vm.prank(alice);
        sla.acceptAgreement(slaId);

        // Time passes — deadline missed
        vm.warp(block.timestamp + 301);

        // Anyone can claim breach
        sla.claimBreach(slaId);

        SLAEngine.SLA memory agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Breached));

        // Alice's stake should be slashed by 15 ether
        uint256 aliceStakeAfter = vault.getAgent(aliceId).stake;
        assertEq(aliceStakeAfter, aliceStakeBefore - 15 ether);

        // Bob should receive: payment refund (30) + 80% of slash (12) = 42 ether in earnings
        uint256 clientRefund = 30 ether + (15 ether * 80 / 100);
        assertEq(vault.getAgent(bobId).earnings, clientRefund);

        // Protocol should receive 20% of slash = 3 ether
        assertEq(billing.totalSlashRevenue(), 15 ether * 20 / 100);
        assertEq(billing.totalSLAsBreached(), 1);

        // Active SLAs back to 0
        assertEq(vault.getAgent(aliceId).activeSLAs, 0);
        assertEq(vault.getAgent(bobId).activeSLAs, 0);
    }

    // ========== Test: Dispute + Timeout + Auto-Breach ==========

    function test_DisputeFlow_TimeoutBreach() public {
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        vm.prank(bob);
        uint256 slaId = sla.createAgreement{value: 30 ether}(
            bobId, aliceId, "data-analysis", keccak256("analyze"), uint64(block.timestamp + 7200), 15 ether
        );

        vm.prank(alice);
        sla.acceptAgreement(slaId);

        // Alice delivers
        vm.prank(alice);
        sla.deliver(slaId, keccak256("bad output"), "ipfs://QmBad", "claude-sonnet-4", "20250514");

        // Bob disputes
        vm.prank(bob);
        sla.disputeDelivery(slaId, "Output does not match specification");

        SLAEngine.SLA memory agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Disputed));
        assertTrue(agreement.disputeDeadline > 0);

        // Output should be reset
        assertEq(agreement.outputHash, bytes32(0));

        // Dispute window passes without re-delivery
        vm.warp(agreement.disputeDeadline + 1);

        // Claim breach after dispute timeout
        sla.claimBreach(slaId);

        agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Breached));
    }

    // ========== Test: Dispute + Re-delivery + Settlement ==========

    function test_DisputeFlow_Redelivery() public {
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        vm.prank(bob);
        uint256 slaId = sla.createAgreement{value: 30 ether}(
            bobId, aliceId, "data-analysis", keccak256("analyze"), uint64(block.timestamp + 7200), 15 ether
        );

        vm.prank(alice);
        sla.acceptAgreement(slaId);

        // First delivery
        vm.prank(alice);
        sla.deliver(slaId, keccak256("first attempt"), "ipfs://Qm1", "claude-sonnet-4", "20250514");

        // Bob disputes
        vm.prank(bob);
        sla.disputeDelivery(slaId, "Incomplete analysis");

        // Alice re-delivers within dispute window
        vm.prank(alice);
        sla.deliver(slaId, keccak256("second attempt better"), "ipfs://Qm2", "claude-sonnet-4", "20250514");

        // Bob settles second delivery
        vm.prank(bob);
        sla.settle(slaId);

        SLAEngine.SLA memory agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Settled));
    }

    // ========== Test: Cancel Proposed SLA ==========

    function test_CancelProposedSLA() public {
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        vm.prank(bob);
        uint256 slaId = sla.createAgreement{value: 30 ether}(
            bobId, aliceId, "data-analysis", keccak256("analyze"), uint64(block.timestamp + 3600), 15 ether
        );

        // Cancel before acceptance
        vm.prank(bob);
        sla.cancelAgreement(slaId);

        SLAEngine.SLA memory agreement = sla.getAgreement(slaId);
        assertEq(uint256(agreement.status), uint256(SLAEngine.Status.Cancelled));

        // Bob should get refund in earnings
        assertEq(vault.getAgent(bobId).earnings, 30 ether);
    }

    // ========== Test: Cannot Breach Before Deadline ==========

    function test_CannotBreachBeforeDeadline() public {
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        vm.prank(bob);
        uint256 slaId = sla.createAgreement{value: 30 ether}(
            bobId, aliceId, "data-analysis", keccak256("analyze"), uint64(block.timestamp + 3600), 15 ether
        );

        vm.prank(alice);
        sla.acceptAgreement(slaId);

        // Try to breach before deadline
        vm.expectRevert("SLA: cannot breach yet");
        sla.claimBreach(slaId);
    }

    // ========== Test: Cannot Withdraw Stake With Active SLAs ==========

    function test_CannotWithdrawStakeWithActiveSLAs() public {
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        vm.prank(bob);
        uint256 slaId = sla.createAgreement{value: 30 ether}(
            bobId, aliceId, "data-analysis", keccak256("analyze"), uint64(block.timestamp + 3600), 15 ether
        );

        vm.prank(alice);
        sla.acceptAgreement(slaId);

        // Alice tries to withdraw stake while SLA is active
        vm.prank(alice);
        vm.expectRevert("AV: active SLAs exist");
        vault.withdrawStake(aliceId, 100 ether);
    }

    // ========== Test: Revenue Accumulation ==========

    function test_RevenueAccumulation() public {
        uint256 aliceId = _registerAliceProvider();
        uint256 bobId = _registerBobBuyer();

        // Execute 3 SLAs
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(bob);
            uint256 slaId = sla.createAgreement{value: 30 ether}(
                bobId, aliceId, "data-analysis", keccak256(abi.encode("analyze", i)),
                uint64(block.timestamp + 3600), 15 ether
            );

            vm.prank(alice);
            sla.acceptAgreement(slaId);

            vm.prank(alice);
            sla.deliver(slaId, keccak256(abi.encode("output", i)), "ipfs://Qm", "claude-sonnet-4", "20250514");

            vm.prank(bob);
            sla.settle(slaId);
        }

        // Verify revenue
        assertEq(billing.totalSLAsSettled(), 3);
        uint256 expectedTotalFees = 3 * (30 ether * 50 / 10000);
        assertEq(billing.totalFeeRevenue(), expectedTotalFees);

        // Verify breakdown
        (uint256 feeRev, uint256 slashRev, uint256 regRev, uint256 total, uint256 settled, uint256 breached) =
            billing.getRevenueBreakdown();
        assertEq(feeRev, expectedTotalFees);
        assertEq(slashRev, 0);
        assertEq(settled, 3);
        assertEq(breached, 0);
    }

    // ========== Test: Session Validation ==========

    function test_GhostWalletSessionValidation() public {
        uint256 aliceId = _registerAliceProvider();

        // Session should be valid
        assertTrue(vault.isSessionValid(aliceId, aliceGhost));

        // Wrong address should fail
        assertFalse(vault.isSessionValid(aliceId, address(0xDEAD)));

        // After expiry should fail
        vm.warp(block.timestamp + 86401);
        assertFalse(vault.isSessionValid(aliceId, aliceGhost));
    }

    // ========== Test: Agent Discovery ==========

    function test_ActiveAgentDiscovery() public {
        _registerAliceProvider();
        _registerBobBuyer();

        (AgentVault.Agent[] memory active, uint256 total) = vault.getActiveAgents(0, 10);
        assertEq(total, 2);
        assertEq(active.length, 2);

        // Pause alice
        vm.prank(alice);
        vault.pauseAgent(1);

        (active, total) = vault.getActiveAgents(0, 10);
        assertEq(total, 1);
        assertEq(active.length, 1);
    }
}
