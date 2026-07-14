<div align="center">

# ClearClaim AI
### The World's First Autonomous Onchain Medical Insurance Platform

**OKX.AI Genesis Hackathon 2026 — Finance Copilot + Best Product**

[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![.NET](https://img.shields.io/badge/.NET-8-purple?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11-yellow?style=flat-square&logo=python)](https://python.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-gray?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![X Layer](https://img.shields.io/badge/X%20Layer-Testnet-black?style=flat-square)](https://www.okx.com/xlayer)

</div>

---

> **Built by:** Suyash Matade (AI & DS Student, VIIT Pune | Intern at Simplify Healthcare)  
> **Hackathon:** OKX.AI Genesis Hackathon · Deadline: July 17, 2026

---

## What is ClearClaim AI?

Traditional insurance is reactive and adversarial — patients file claims, insurers try to reject them.

**ClearClaim AI flips this model:** 11 autonomous AI agents work 24/7 to keep patients healthy, process claims in seconds, detect fraud automatically, and record every decision immutably on the X Layer blockchain — with a LangGraph workflow that pauses for a human only when the AI isn't sure, and resumes from the exact same step even after a crash.

**Autonomous by default. Human-supervised when it matters. Fully verifiable onchain.**

---

## 11-Agent Architecture

```
ClearClaim AI — Agent Layer (FastAPI, port 8000)
│
├── Agent 1:  Claim Processor     — Gemini 3.5 Flash autonomous adjudication + SSE stream
├── Agent 2:  Fraud Detector      — Algorithmic 0-100 risk scoring (instant, no LLM)
├── Agent 3:  Policy Advisor      — Gemini + RAG plan recommendation (cites IRDAI clauses)
├── Agent 4:  Orchestrator        — Legacy pipeline: Fraud → Gemini → Blockchain
├── Agent 5:  Predictive Risk     — Nightly scan, predicts claims 6 months ahead
├── Agent 6:  Health Guardian     — Proactive 90-day care plans for high-risk patients
├── Agent 7:  Hospital Assistant  — ICD-10 coding + rules-gated pre-authorization
├── Agent 8:  Health Passport     — Soulbound onchain health record on X Layer
├── Agent 9:  Chat Agent          — Gemini tool-calling concierge (6 tools)
├── Agent 10: Self-Learning RLHF  — Learns new rules from human overrides, nightly
└── Agent 11: LangGraph Orchestrator — THE production pipeline (see below)
│
├── LangGraph Claim Workflow (SQLite-checkpointed, crash-resumable)
│   fetch → IRDAI rules gate → fraud → clinical cross-check → Gemini
│         → human checkpoint (low confidence / fraud ≥85 / >₹5L pauses for admin)
│         → onchain record → persist
│   ├── Deterministic IRDAI rules BEFORE any LLM call: waiting periods,
│   │   permanent exclusions, room-rent proportionate deduction, senior
│   │   co-pay, cumulative bonus — every rejection cites its clause
│   ├── Crash mid-claim? The graph resumes at the exact node (checkpoints.db)
│   └── Full audit trail — every decision replayable step-by-step (/agent/traces)
│
├── Agent Economics (the OKX.AI thesis, live)
│   Every paid /mcp/invoke books revenue vs compute cost into `agentledger`
│   → GET /agent/economics/pnl — agents run at ~99% margin per call
│
├── 4 Smart Contracts LIVE on X Layer Testnet (chainId 1952)
│   ├── InsuranceClaim.sol    — Every AI claim decision, immutable
│   ├── RiskOracle.sol        — Predictive risk scores, tamper-proof
│   ├── HealthGuardian.sol    — Proves the AI acted BEFORE claims happened
│   └── HealthPassport.sol    — Soulbound patient health record
│
└── OKX.AI ASP Compliance
    ├── GET  /mcp/tools              — 8-tool manifest (pay-per-call, USDT priced)
    ├── POST /mcp/invoke             — Routes OKX marketplace calls + books the ledger
    └── GET  /.well-known/agent.json — ASP identity card
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + Framer Motion |
| Backend | ASP.NET Core 8, Clean Architecture, CQRS (9 layers) |
| Read API | Dapper (port 5234) |
| Write API | EF Core (port 5130) |
| AI Agents | Python 3.11 + FastAPI + **LangGraph 1.x** + Gemini 3.5 Flash |
| Database | PostgreSQL 16 (7 tables, 7 triggers) |
| Blockchain | Solidity 0.8.20, Hardhat, X Layer Testnet (chainId 1952) |
| Web3 Bridge | web3.py |
| Scheduler | APScheduler (nightly autonomous risk scan) |

---

## Setup & Running

### 1. Database
```bash
# In pgAdmin or psql:
CREATE DATABASE medical_insurance;
# Run: database/MedicalInsurance.sql
```

### 2. Backend (.NET)
```bash
cd Medical-Insurance
# Update appsettings.json with your PostgreSQL password in both API projects

# Terminal 1 — Read API
cd Com.Application.Domain.ReadAPI && dotnet run
# Runs on http://localhost:5234

# Terminal 2 — Write API  
cd Com.Application.Domain.WriteAPI && dotnet run
# Runs on http://localhost:5130
```

### 3. AI Agents (Python)
```bash
cd agents
pip install -r requirements.txt
# Edit .env — set GEMINI_API_KEY and DB_PASSWORD

python main.py
# Runs on http://localhost:8000
# All 11 agents available + APScheduler nightly scan
```

### 4. Smart Contracts (Web3)
```bash
cd web3
npm install

# Edit .env — set AGENT_PRIVATE_KEY from OKX Wallet Extension
# Get testnet OKB from: https://www.okx.com/xlayer/faucet

npm run full-deploy
# Compiles → deploys all 3 contracts → extracts ABIs
# Copy CONTRACT_ADDRESS, RISK_ORACLE_ADDRESS, HEALTH_GUARDIAN_ADDRESS to agents/.env
```

### 5. Frontend
```bash
cd clearclaim-frontend
npm install && npm run dev
# Runs on http://localhost:5173
```

---

## Key API Endpoints

| Endpoint | Agent | Description |
|---|---|---|
| `GET /agent/status` | All | Health check + agent roster |
| `POST /agent/process-claims` | 1 | Batch process all pending claims |
| `GET /agent/process-claims/stream` | 1 | SSE live terminal stream |
| `GET /agent/fraud-score/{id}` | 2 | Instant fraud score |
| `POST /agent/recommend-policy` | 3 | AI plan recommendation |
| `POST /agent/orchestrate/claim/{id}` | 4 | Full autonomous pipeline |
| `GET /agent/predictive-scan` | 5 | Scan all customers |
| `POST /agent/health-guardian/{id}` | 6 | Generate care plan |
| `GET /mcp/tools` | OKX | Tool manifest |
| `POST /mcp/invoke` | OKX | Marketplace invocation |

---

## Smart Contracts (X Layer Testnet)

| Contract | Purpose | Key Function |
|---|---|---|
| `InsuranceClaim.sol` | Claim decision audit | `recordDecision(claimId, decision, reasoningHash, confidence)` |
| `RiskOracle.sol` | Predictive risk scores | `recordRiskScore(customerId, riskScoreBps, riskLevel, ...)` |
| `HealthGuardian.sol` | Proactive interventions | `recordIntervention(customerId, riskScoreBps, carePlanHash, ...)` |

All contracts verified on: https://explorer.xlayer.tech

---

## Demo Flow (90 seconds)

1. Land on `clearclaim.ai` → see autonomous insurance platform
2. Admin logs in → sees pending claims with fraud scores
3. Clicks "Run AI Agent" → terminal streams live: fraud check → Gemini → blockchain TX
4. Expands a claim → AI reasoning + X Layer explorer link
5. Customer view → "AI Health Alert" card from Health Guardian
6. **"Every decision. Immutable. Onchain. This is ClearClaim AI."**

---

<div align="center">
<i>Built at Simplify Healthcare · Powered by Gemini 3.5 Flash + LangGraph · Onchain via OKX X Layer</i>
</div>
