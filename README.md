<div align="center">

# ClearClaim AI

### Autonomous Medical Insurance, Settled Onchain

**11 AI agents adjudicate claims, predict health risks, and earn per task — every decision immutably recorded on OKX X Layer.**

[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![.NET](https://img.shields.io/badge/.NET-8-purple?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![Python](https://img.shields.io/badge/Python-3.11-yellow?style=flat-square&logo=python)](https://python.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.x-orange?style=flat-square)](https://langchain-ai.github.io/langgraph/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20·%20Neon-blue?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-gray?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![X Layer](https://img.shields.io/badge/X%20Layer-Testnet%20·%201952-black?style=flat-square)](https://www.okx.com/xlayer)

**OKX.AI Genesis Hackathon 2026 · Finance Copilot + Best Product**

Built by **Suyash Matade** — AI & DS, VIIT Pune · Intern @ Simplify Healthcare

</div>

---

## The Problem

Traditional health insurance is reactive and adversarial. Claims take days, decisions are opaque, fraud checks are manual, and patients only hear from their insurer when something goes wrong.

## The Solution

ClearClaim AI flips the model. Eleven autonomous agents process claims in seconds, cite the exact IRDAI clause behind every decision, predict health risks before they become claims, and write every verdict to the X Layer blockchain. A human is pulled in **only** when the AI isn't sure — and the workflow resumes from the exact step it paused on, even after a crash.

```
Claim submitted
   └─▶ IRDAI Rules Gate        deterministic — exclusions & waiting periods, zero LLM cost
        └─▶ Fraud Detector      algorithmic 0–100 score, 7 rules
             └─▶ Clinical Review  ICD-10 cross-check (mid-band fraud only)
                  └─▶ Gemini 3.5 Flash adjudication  + RAG policy clauses
                       ├─▶ confident ──▶ X Layer onchain record ──▶ settled ✅
                       └─▶ uncertain / high-value ──▶ HUMAN CHECKPOINT ⏸
                                └─ admin approves → graph resumes from that exact node
```

**The workflow is crash-proof.** Every step checkpoints to disk (LangGraph + SQLite). Kill the server mid-claim, restart, and the paused claim is still in the Review Queue, resumable from the same node — with a full timestamped audit trail.

---

## The 11 Agents

| # | Agent | What it does | Engine |
|---|-------|--------------|--------|
| 1 | **Claim Processor** | Autonomous adjudication with live SSE streaming | Gemini 3.5 Flash + RAG |
| 2 | **Fraud Detector** | Instant 0–100 risk score (temporal, frequency, coverage & history rules) | Pure algorithm — no LLM |
| 3 | **Policy Advisor** | Recommends the right plan, citing IRDAI clauses | Gemini + RAG |
| 4 | **LangGraph Orchestrator** | Stateful, checkpointed, human-in-the-loop claim pipeline | LangGraph 1.x |
| 5 | **Predictive Risk** | Nightly 2 AM scan — predicts claims months ahead | Gemini |
| 6 | **Health Guardian** | Auto-generates 90-day care plans for high-risk patients | Gemini |
| 7 | **Hospital Assistant** | ICD-10 coding, documentation checklists, rules-gated pre-authorization | Gemini + rules engine |
| 8 | **Health Passport** | Soulbound onchain health record per patient | X Layer contract |
| 9 | **Chat Concierge** | Tool-calling assistant with live DB access (6 tools) | Gemini function calling |
| 10 | **RLHF Self-Learning** | Extracts new rules from human overrides, nightly | Gemini |
| 11 | **Legacy Pipeline** | Original fraud → LLM → chain orchestrator (fallback) | httpx chain |

### Deterministic before generative

Every claim hits `business_rules.py` **before** any LLM call: permanent exclusions, 30-day/24-month/36-month waiting periods (with the accident carve-out), room-rent proportionate deduction, 20% senior co-pay, and cumulative bonus. Rejections cite their clause. Exclusions never cost a Gemini token.

### Agents that earn (the OKX.AI thesis)

Every capability is a priced tool on the OKX.AI marketplace (`/mcp/tools`, x402-style pay-per-call). Each invocation books revenue vs estimated compute cost into the `agentledger` table — the Admin → Economics dashboard shows live per-agent P&L running at **~99% margin**.

---

## Smart Contracts — Live on X Layer Testnet (chainId 1952)

| Contract | Address | Purpose |
|----------|---------|---------|
| `InsuranceClaim.sol` | [`0xed7c…A709`](https://www.oklink.com/xlayer-test/address/0xed7c36ce8EB540e35604a9eeFa72f3b19106A709) | Every AI decision hash, confidence & verdict |
| `RiskOracle.sol` | [`0x428b…cc1a`](https://www.oklink.com/xlayer-test/address/0x428bE934f782D0Ba4556cB84680bDe233d07cc1a) | Predictive risk scores, tamper-proof |
| `HealthGuardian.sol` | [`0x0F4F…87dE`](https://www.oklink.com/xlayer-test/address/0x0F4FEB6E515eEEb90bed9E6cC10f556a6c7287dE) | Proves the AI intervened **before** claims happened |
| `HealthPassport.sol` | [`0x63cC…f3E3`](https://www.oklink.com/xlayer-test/address/0x63cC01DDC2aCd8a230679E29A7Be7EBe5769f3E3) | Soulbound patient health record |
| `PremiumVault.sol` | [`0xd971…bcd0`](https://www.oklink.com/xlayer-test/address/0xd97177B7268624b4949fd265245E74A51633bcd0) | Accepts premium payments in OKB, emits `PremiumPaid` |

Covered by a **70-test Hardhat suite** (`web3/test/`, local network) — events, access control, state, and edge cases. Run `npx hardhat test` in `web3/`.

---

## Repository Structure

```
ClearClaim/
│
├── clearclaim-frontend/                    React 18 + TypeScript + Vite + Tailwind + Framer Motion
│   ├── .env.example                        VITE_AGENT_API_URL (deployed gateway URL)
│   └── src/
│       ├── App.tsx                         code-split routes (React.lazy) for all 3 role portals
│       ├── pages/
│       │   ├── Landing.tsx                 product landing — hero, 11-agent roster, live stats
│       │   ├── Login.tsx · Register.tsx    role-based auth (customer / admin / hospital)
│       │   ├── DbExplorer.tsx              admin CRUD over the 7 core tables
│       │   ├── customer/                   Dashboard · BrowsePlans · PurchasePolicy · MyPolicies
│       │   │                               SubmitClaim (3-step wizard + fraud preview) · MyClaims
│       │   │                               FamilyMembers
│       │   ├── admin/                      AdminDashboard (SSE terminal) · PendingClaims
│       │   │                               ReviewQueue (human-in-the-loop) · AgentEconomics (P&L)
│       │   │                               CustomerSearch
│       │   └── hospital/                   HospitalDashboard · HospitalClaims (AI clinical review)
│       │                                   HospitalPatientLookup · HospitalNetwork
│       ├── components/                     ChatWidget · DecisionReplayModal (audit-trail replay)
│       │                                   PaymentModal (OKB → PremiumVault) · FraudScoreBadge
│       │                                   TxHashLink · AgentStatusPanel · Navbar · …
│       ├── services/                       typed HTTP clients — AgentHttpService (gateway :8000),
│       │                                   axiosConfig (ReadAPI :5234 / WriteAPI :5130), per-domain services
│       └── store/                          Redux Toolkit with persisted auth slice
│
├── Medical-Insurance/                      .NET 8 — Clean Architecture, CQRS (9 projects)
│   ├── Com.Application.Domain.ReadAPI/     Dapper read side → :5234 (queries, dashboards, search)
│   ├── Com.Application.Domain.WriteAPI/    EF Core write side → :5130 (register, purchase, claims,
│   │                                       approvals) + FluentValidation
│   ├── Com.Application.Domain.Contract/            service interfaces
│   ├── Com.Application.Domain.DataAccessContract/  data-access interfaces
│   ├── Com.Application.Domain.Entities/            domain models (Customer, Claim, Policy, …)
│   ├── Com.Application.Domain.Read{Repository,DataAccess}/    Dapper implementations
│   └── Com.Application.Domain.Write{Respository,DataAccess}/  EF Core implementations
│
├── agents/                                 Python 3.11 + FastAPI unified gateway → :8000
│   ├── main.py                             mounts all 11 agents · APScheduler (30-min auto-claims,
│   │                                       2 AM predictive scan) · env-driven CORS
│   ├── requirements.txt · .env.example     deps + environment template (Render-ready)
│   ├── orchestrator/
│   │   ├── graph.py                        ★ LangGraph workflow — ClaimState, 9 nodes, conditional
│   │   │                                   routing, SQLite checkpointing, human-interrupt
│   │   ├── graph_router.py                 /agent/graph/* — run, state, resume, checkpoints, queue
│   │   └── router.py                       legacy httpx pipeline (fallback)
│   ├── claim_processor/                    Gemini adjudication + SSE stream (Agent 1)
│   ├── fraud_detector/                     algorithmic 0–100 scoring, no LLM (Agent 2)
│   ├── policy_advisor/                     RAG-grounded plan recommendation (Agent 3)
│   ├── predictive_risk/                    nightly risk scans (Agent 5)
│   ├── health_guardian/                    90-day care plans, auto-triggered (Agent 6)
│   ├── hospital_assistant/                 ICD-10 coding + rules-gated pre-auth (Agent 7)
│   ├── health_passport/                    soulbound record mint/read (Agent 8)
│   ├── chat_agent/                         tool-calling concierge, 6 tools (Agent 9)
│   ├── rlhf/ + rlhf_pipeline.py            learns rules from human overrides (Agent 10)
│   ├── plan_hospital/                      plan↔hospital network management
│   ├── economics/                          agentledger P&L — /pnl, /leaderboard, /ledger
│   ├── observability/                      /agent/metrics + /agent/traces (flight recorder)
│   ├── mcp/                                OKX.AI ASP layer — /.well-known/agent.json,
│   │                                       /mcp/tools (8 priced tools), /mcp/invoke (books ledger)
│   └── shared/                             db.py (Postgres) · gemini_client.py (key rotation +
│                                           model fallback) · business_rules.py (IRDAI engine) ·
│                                           blockchain.py (web3 bridge) · rag.py (vector search) ·
│                                           prompts.py · metrics.py · config.py
│
├── web3/                                   Hardhat (Solidity 0.8.20, X Layer testnet 1952)
│   ├── contracts/                          InsuranceClaim · RiskOracle · HealthGuardian ·
│   │                                       HealthPassport · PremiumVault
│   ├── test/                               70-test suite (events, access control, edge cases)
│   ├── scripts/                            deploy.js · deploy_vault.js · extract_abi.js
│   ├── abi/                                extracted ABIs consumed by the Python bridge
│   └── deployments.json                    live addresses per contract
│
├── database/                               PostgreSQL 16 (production on Neon)
│   ├── MedicalInsurance.sql                schema — 7 core tables + business-rule triggers
│   ├── migration_001.sql · migration_ai.sql        AI columns (ai_decision, fraud_score, tx_hash…)
│   ├── seed_demo_data.sql · realistic_insurance_plans_2026.sql · insert_more_plans.sql
│   └── backup.sql                          Neon snapshot
│
├── docs/                                   architecture diagrams (class + workflow)
├── START_ALL_SERVICES.bat                  one-click local boot (APIs + agents + frontend)
└── test_services.ps1                       health check across all services
```

---

## Quick Start (Local)

**Prerequisites:** .NET 8 SDK · Python 3.11 · Node 20 · PostgreSQL 16 (or a Neon connection string) · a [Gemini API key](https://aistudio.google.com/app/apikey)

```bash
# 1 · Database — local Postgres (or point .env / appsettings at Neon)
psql -U postgres -c "CREATE DATABASE medical_insurance"
psql -U postgres -d medical_insurance -f database/MedicalInsurance.sql
psql -U postgres -d medical_insurance -f database/seed_demo_data.sql

# 2 · Backend APIs (two terminals)          → :5234 / :5130
cd Medical-Insurance/Com.Application.Domain.ReadAPI  && dotnet run
cd Medical-Insurance/Com.Application.Domain.WriteAPI && dotnet run

# 3 · AI Agents                              → :8000
cd agents
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env                       # fill in GEMINI_API_KEY, DB_PASSWORD, AGENT_PRIVATE_KEY
python main.py

# 4 · Frontend                               → :5173
cd clearclaim-frontend
npm install && npm run dev

# 5 · Contract tests (optional)
cd web3 && npm install && npx hardhat test   # 70 passing, local network only
```

Or just run **`START_ALL_SERVICES.bat`** and verify with **`test_services.ps1`**.

### Demo Credentials

| Role | Login |
|------|-------|
| Customer | `suy@gmail.com` / `password123` |
| Admin | password `ClearClaim@Admin2026` |
| Hospital | ID `1` / `hospital@2026` |

---

## API Surface (Agent Gateway · :8000)

| Area | Endpoints |
|------|-----------|
| Health | `GET /agent/status` |
| LangGraph workflow | `POST /agent/graph/run/{claim_id}` · `GET /agent/graph/review-queue` · `POST /agent/graph/resume/{thread_id}` · `GET /agent/graph/checkpoints/{claim_id}` |
| Claims | `POST /agent/process-claims` (+ SSE `/stream`) · `GET /agent/fraud-score/{id}` |
| Health AI | `GET /agent/predictive-scan` · `POST/GET /agent/health-guardian/{customer_id}` |
| Hospital | `GET /agent/hospital-assistant/{claim_id}` · `POST /agent/hospital-assistant/pre-auth` |
| Advice & chat | `POST /agent/recommend-policy` · `POST /agent/chat` |
| Economics | `GET /agent/economics/pnl` · `/leaderboard` · `/ledger` |
| Observability | `GET /agent/metrics` · `GET /agent/traces/{claim_id}` |
| **OKX.AI ASP** | `GET /.well-known/agent.json` · `GET /mcp/tools` · `POST /mcp/invoke` — 8 priced tools |

Interactive docs at `http://localhost:8000/docs` (FastAPI Swagger).

---

## Deployment

| Component | Target | Status |
|-----------|--------|--------|
| PostgreSQL | **Neon** (serverless) | ✅ Live — `database/backup.sql` is the snapshot |
| AI Agents (FastAPI) | **Render** | ✅ Live — start command `uvicorn main:app --host 0.0.0.0 --port $PORT` from `agents/` |
| Frontend | Vercel / Netlify | `npm run build` in `clearclaim-frontend/` |
| Contracts | X Layer Testnet (1952) | ✅ 5 contracts deployed (addresses above) |

**Environment wiring** (all secrets live in env vars — nothing sensitive is committed):

- **Render (agents)** — set everything from `agents/.env.example`: `GEMINI_API_KEY`, the Neon `DB_*` values, `AGENT_PRIVATE_KEY`, contract addresses, and `FRONTEND_ORIGIN` (your deployed frontend URL, for CORS).
- **Vercel/Netlify (frontend)** — set `VITE_AGENT_API_URL` to the Render service URL (see `clearclaim-frontend/.env.example`). Local dev needs no env file — everything falls back to localhost.

---

## Engineering Highlights

- **Crash-resumable workflows** — LangGraph + SQLite checkpointing; verified by killing the process mid-claim and resuming.
- **Graceful degradation everywhere** — Gemini quota exhausted → rule-based fallback routed to human review; WriteAPI down → direct DB persistence; blockchain unreachable → decision still settles. No single dependency can take the platform down.
- **Self-improving** — human overrides are mined nightly into new rules injected into future prompts (RLHF-style, Agent 10).
- **Full auditability** — every decision is replayable step-by-step (`/agent/traces`), and its hash is verifiable onchain.
- **API-key resilience** — automatic key rotation and model fallback (3.5-flash → 2.5-flash) in the Gemini client.

---

<div align="center">
<i>Built with ❤️ by Suyash Matade · Powered by Gemini 3.5 Flash + LangGraph · Onchain via OKX X Layer</i>
</div>
