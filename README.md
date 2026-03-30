# AeroFyta

**The On-Chain Operations & Settlement Layer for Enterprise AI Agents**

Self-enforcing SLAs with staked performance bonds. Tamper-proof AI decision audit trails. Chain-level spending governance via Ghost Wallets. Built as a dedicated Initia Minitia.

---

## Initia Hackathon Submission

**Project Name:** AeroFyta

**Overview:** 40% of enterprise AI agent initiatives will be cancelled by 2027 because nobody solved governance and accountability. AeroFyta is the on-chain operations platform that gives enterprises the spending controls, self-enforcing service agreements, and tamper-proof audit trails they need to deploy AI agents safely. It targets operations teams, compliance officers, and AI governance boards at enterprises deploying autonomous agents.

**Custom Implementation:** AeroFyta introduces three novel primitives: (1) On-chain Service Level Agreements that self-execute with escrowed payments and automatic breach detection, (2) Agent Performance Bonds where service providers stake collateral that gets slashed on SLA breach, and (3) Tamper-proof audit trail events recording every AI decision with model attribution (model ID, version, input/output hashes) for EU AI Act record-keeping requirements.

**Native Feature — Auto-Signing:** Ghost Wallet sessions are structurally required for agent autonomy. When an agent is registered, the owner grants a scoped Ghost Wallet session with spending caps, contract whitelists, and time limits — all enforced at Initia's chain consensus level via AuthZ. This enables agents to accept SLAs, execute work, and deliver results autonomously without human signing. Without auto-signing, AeroFyta cannot function.

**Additional Native Features:** .init Usernames (agent identity layer — every agent is a .init name), Interwoven Bridge (cross-chain agent operations).

### Local Setup

1. **Smart Contracts:**
   ```bash
   cd contracts
   forge install
   forge build
   forge test  # 10/10 tests pass
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   npm run dev  # http://localhost:3000
   ```

3. **AI Agent Runtime:**
   ```bash
   cd services/agent-runtime
   pip install -r requirements.txt
   cp ../../.env.example .env  # Add your ANTHROPIC_API_KEY
   python api/server.py  # http://localhost:8000
   ```

4. **Deploy Contracts (to Minitia):**
   ```bash
   cd contracts
   forge script script/Deploy.s.sol --rpc-url $JSON_RPC_URL --broadcast
   ```

---

## Architecture

```
INITIA L1 (Slinky Oracle + InitiaDEX + .init Registry + Bridge)
    │
    │ IBC / OPinit
    │
AEROFYTA MINITIA (aerofyta-1, EVM)
    ├── AgentVault.sol    — Agent identity, staking, Ghost Wallet sessions
    ├── SLAEngine.sol     — Self-enforcing SLAs with escrow, delivery, settlement, breach
    └── BillingEngine.sol — Protocol revenue: fees + slash + registration
    │
    ├── AI Agent Runtime (Python + Claude Sonnet 4)
    │   └── Data Analyst agent: fetches real data → produces analysis → delivers on-chain
    │
    └── Frontend (Next.js + InterwovenKit + Tailwind)
        └── Dashboard, Register, Agents, SLA Marketplace, Analytics
```

## Initia Features Used

| Feature | Integration Depth | How |
|---------|------------------|-----|
| **Auto-Signing (Ghost Wallets)** | Deep — structurally required | Agents operate via scoped AuthZ sessions. Without it, no autonomy. |
| **.init Usernames** | Deep — identity layer | Every agent IS a .init identity used for discovery, reputation, and audit trails. |
| **Interwoven Bridge** | Moderate — widget + programmatic | Bridge widget in header. Agents can bridge earnings cross-chain. |
| **InterwovenKit** | Deep — full hook suite | Wallet connect, auto-sign management, bridge modal, chain context. |
| **Slinky Oracle** | Moderate — data source | Agent fetches real-time prices for analysis. Freshness validated. |
| **Own Minitia** | Deep — revenue model | aerofyta-1 chain. All gas = protocol sequencer revenue. |

## Revenue Model

| Stream | Mechanism | Rate |
|--------|-----------|------|
| Registration Fee | Per agent deployed | 25 INIT |
| Platform Fee | Per SLA settlement | 0.5% of payment |
| Slash Revenue | Per SLA breach | 20% of slash amount |
| Sequencer Gas | All txs on aerofyta-1 | 100% to protocol |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, InterwovenKit |
| AI Runtime | Python 3.11, FastAPI, Anthropic SDK (Claude Sonnet 4) |
| Blockchain | Initia MiniEVM Rollup, OPinit, IBC Relayer |
| Oracle | Slinky (consensus-integrated) |

## Demo Video

[YouTube Link — PENDING]

---

**Chain ID:** `aerofyta-1` | **VM:** EVM | **Track:** AI & Tooling

Built for INITIATE: The Initia Hackathon (Season 1)
