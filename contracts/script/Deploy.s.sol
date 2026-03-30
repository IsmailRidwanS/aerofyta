// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentVault.sol";
import "../src/SLAEngine.sol";
import "../src/BillingEngine.sol";

/// @title Deploy Script — Deploys all AeroFyta contracts
/// @notice Run: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
contract DeployAeroFyta is Script {
    uint256 public constant REGISTRATION_FEE = 25 ether; // 25 INIT
    uint256 public constant MINIMUM_STAKE = 50 ether; // 50 INIT

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy BillingEngine first (no dependencies)
        BillingEngine billing = new BillingEngine();
        console.log("BillingEngine deployed at:", address(billing));

        // 2. Deploy AgentVault
        AgentVault vault = new AgentVault(REGISTRATION_FEE, MINIMUM_STAKE);
        console.log("AgentVault deployed at:", address(vault));

        // 3. Deploy SLAEngine (depends on vault + billing)
        SLAEngine slaEngine = new SLAEngine(address(vault), address(billing));
        console.log("SLAEngine deployed at:", address(slaEngine));

        // 4. Wire contracts together
        vault.setSLAEngine(address(slaEngine));
        billing.setSLAEngine(address(slaEngine));
        console.log("Contracts wired together");

        vm.stopBroadcast();

        // Output deployment summary
        console.log("\n=== AeroFyta Deployment Summary ===");
        console.log("Chain ID: aerofyta-1");
        console.log("AgentVault:", address(vault));
        console.log("SLAEngine:", address(slaEngine));
        console.log("BillingEngine:", address(billing));
        console.log("Registration Fee:", REGISTRATION_FEE);
        console.log("Minimum Stake:", MINIMUM_STAKE);
        console.log("Platform Fee: 0.5% (50 bps)");
        console.log("===================================\n");
    }
}
