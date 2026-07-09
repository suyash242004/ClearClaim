// Docs.tsx — Vercel/Stripe-style documentation page
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Brain, Bot, Shield, Code, Zap,
  Database, BookOpen, Activity, ChevronRight
} from "lucide-react";
import TerminalWindow from "../components/TerminalWindow";

// ── Sidebar sections ─────────────────────────────────────────────
const sections = [
  { id: "overview",        label: "Overview",             icon: BookOpen },
  { id: "ai-agents",       label: "AI Agents",            icon: Bot },
  { id: "web3",            label: "X Layer Blockchain",   icon: Shield },
  { id: "api-reference",   label: "API Reference",        icon: Code },
  { id: "how-it-works",    label: "How Claims Work",      icon: Activity },
  { id: "okx-integration", label: "OKX.AI Integration",   icon: Zap },
] as const;

type SectionId = typeof sections[number]["id"];

// ── Colour token ─────────────────────────────────────────────────
const S = {
  bg: "#080810",
  surface: "#111",
  border: "rgba(255,255,255,0.06)",
  text: "#F8FAFC",
  muted: "#64748B",
  accent: "#6366F1",
};

// ── Code block component ─────────────────────────────────────────
function CodeBlock({ children }: { children: string }) {
  return (
    <TerminalWindow className="my-6 shadow-2xl">
      <pre className="overflow-x-auto text-xs" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: "#A5B4FC", lineHeight: 1.7 }}>
        <code>{children.trim()}</code>
      </pre>
    </TerminalWindow>
  );
}

// ── Section heading ───────────────────────────────────────────────
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-3xl font-bold mt-16 mb-6 font-serif-display tracking-wide" style={{ color: S.text }}>
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mt-6 mb-2" style={{ color: S.text }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed mb-3" style={{ color: "#94A3B8" }}>{children}</p>;
}

function InlineCode({ children }: { children: string }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-[11px] font-mono tracking-wider"
      style={{ background: "rgba(99,102,241,0.1)", color: "#A5B4FC", border: "1px solid rgba(99,102,241,0.2)" }}
    >
      {children}
    </code>
  );
}

// ── Agent card ────────────────────────────────────────────────────
function AgentCard({ name, port, color, desc, endpoint }: {
  name: string; port: number; color: string; desc: string; endpoint: string;
}) {
  return (
    <div className="p-4 rounded-xl mb-3" style={{ background: S.surface, border: `1px solid ${color}22` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="font-semibold text-sm" style={{ color }}>{name}</span>
        <span className="text-xs" style={{ color: S.muted }}>port {port}</span>
      </div>
      <p className="text-xs leading-relaxed mb-2" style={{ color: "#94A3B8" }}>{desc}</p>
      <InlineCode>{endpoint}</InlineCode>
    </div>
  );
}

// ── API row ───────────────────────────────────────────────────────
function ApiRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColor: Record<string, string> = {
    GET: "#34D399", POST: "#60A5FA", PUT: "#FBBF24", DELETE: "#F87171"
  };
  return (
    <div className="flex items-start gap-3 py-2.5 border-b" style={{ borderColor: S.border }}>
      <span
        className="text-xs font-mono font-bold shrink-0 w-12"
        style={{ color: methodColor[method] ?? "#94A3B8" }}
      >
        {method}
      </span>
      <code className="text-xs font-mono shrink-0" style={{ color: "#93C5FD" }}>{path}</code>
      <span className="text-xs" style={{ color: S.muted }}>{desc}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function Docs() {
  const [active, setActive] = useState<SectionId>("overview");

  const scrollTo = (id: SectionId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-grid" style={{ background: S.bg }}>

      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-14"
        style={{
          background: "rgba(5,8,16,0.9)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-white"
          style={{ color: S.muted }}
        >
          <ArrowLeft size={15} /> Back to App
        </Link>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "#fff" }}
          >
            <Brain size={12} color="#000" />
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ color: S.text }}>
            ClearClaim <span className="gradient-text-indigo">AI</span> Docs
          </span>
        </div>
        <div />
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto flex gap-8 px-4 md:px-6 py-10">

        {/* Sidebar */}
        <aside className="hidden md:block w-52 shrink-0 sticky top-24 h-fit">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: S.muted }}>
            Documentation
          </p>
          <nav className="space-y-0.5">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all duration-150"
                style={{
                  background: active === id ? "rgba(37,99,235,0.1)" : "transparent",
                  color: active === id ? S.accent : S.muted,
                  fontWeight: active === id ? 600 : 400,
                }}
              >
                <Icon size={13} />
                {label}
                {active === id && <ChevronRight size={12} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 min-w-0"
        >
          {/* Hero */}
          <div className="mb-14">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-wide"
              style={{ background: "rgba(99,102,241,0.1)", color: S.accent, border: `1px solid rgba(99,102,241,0.22)` }}
            >
              <BookOpen size={12} /> Documentation v1.0
            </div>
            <h1 className="text-5xl font-bold mb-4 font-serif-display tracking-wide" style={{ color: S.text }}>
              Welcome to ClearClaim <span className="gradient-text-indigo font-sans tracking-tight">AI</span>
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "#94A3B8" }}>
              The world's first autonomous onchain medical insurance platform — built for the{" "}
              <span className="font-semibold" style={{ color: S.text }}>OKX.AI Genesis Hackathon 2026</span>.
            </p>
          </div>

          <hr style={{ borderColor: S.border, marginBottom: "2.5rem" }} />

          {/* ── Overview ── */}
          <section id="overview">
            <SectionHeading id="overview">Overview</SectionHeading>
            <P>
              ClearClaim AI replaces manual insurance claim processing with three autonomous AI agents powered by
              Google Gemini 2.5 Flash. Every claim decision is cryptographically recorded on the X Layer blockchain
              via OKX OnchainOS — creating an immutable, verifiable audit trail with zero human delay.
            </P>
            <P>
              Built on a battle-tested enterprise stack: .NET 8 Clean Architecture backend with CQRS pattern,
              React 18 + TypeScript frontend, PostgreSQL 16 database with business-rule-enforcing triggers, and
              Python FastAPI AI agents — all wired together into a production-grade system.
            </P>
            <div className="grid sm:grid-cols-3 gap-3 mt-8">
              {[
                { label: "Backend",  value: ".NET 8 Clean Architecture",    color: "#6366F1" },
                { label: "Database", value: "PostgreSQL 16 + 7 triggers",   color: "#10B981" },
                { label: "AI",       value: "Gemini 2.5 Flash (free tier)", color: "#F59E0B" },
                { label: "Frontend", value: "React 18 + TypeScript + Vite", color: "#A78BFA" },
                { label: "Agents",   value: "Python FastAPI microservices", color: "#EF4444" },
                { label: "Web3",     value: "X Layer (OKX) + OnchainOS",    color: "#10B981" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 rounded-xl transition-colors hover:border-indigo-500/30" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color }}>{label}</p>
                  <p className="text-sm font-medium" style={{ color: "#F8FAFC" }}>{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── AI Agents ── */}
          <section id="ai-agents" className="mt-12">
            <SectionHeading id="ai-agents">AI Agents</SectionHeading>
            <P>
              Three specialized FastAPI microservices form the autonomous agent layer. They operate independently,
              each consuming the existing .NET Read/Write APIs — no changes to the core backend required.
            </P>

            <AgentCard
              name="Claim Processor Agent"
              port={8000}
              color="#6366F1"
              desc="Reads all pending claims via ReadAPI, sends each claim's full context (patient history, policy coverage, hospital validity, temporal data) to Gemini 2.5 Flash, then autonomously calls WriteAPI to Approve, Reject, or Flag each claim. Stores AI reasoning and confidence score to the database."
              endpoint="POST /agent/process-claims"
            />
            <AgentCard
              name="Fraud Detector Agent"
              port={8001}
              color="#F59E0B"
              desc="Algorithmic fraud scorer (no LLM, instant response). Calculates a 0–100 risk score based on: disease-history mismatch, claim amount as % of remaining coverage, temporal fraud signals (days since policy start), and claim frequency patterns."
              endpoint="GET /agent/fraud-score/{claimId}"
            />
            <AgentCard
              name="Policy Advisor Agent"
              port={8002}
              color="#10B981"
              desc="NLP agent powered by Gemini 2.5 Flash. Customer provides age, family size, budget, and medical history in plain text. Agent queries all available plans and returns the best recommendation with detailed reasoning and confidence score."
              endpoint="POST /agent/recommend-policy"
            />

            <H3>Agent Decision Flow</H3>
            <CodeBlock>{`
Customer submits claim → status = "Pending"
         ↓
Admin clicks "Run AI Agent"
         ↓
Claim Processor reads pending claims from ReadAPI (:5234)
         ↓
For each claim:
  • Gets customer history from PostgreSQL (direct query)
  • Gets policy details & coverage amount
  • Checks hospital-plan validity
  • Sends full context to Gemini 2.5 Flash
         ↓
Gemini returns: { decision, reasoning, confidence_score, fraud_indicators }
         ↓
Agent calls WriteAPI (:5130) → PUT /api/admin/claims/approve/{id}
                             or PUT /api/admin/claims/reject/{id}
         ↓
Stores ai_decision, ai_reasoning, ai_confidence, fraud_score to Claims table
         ↓
(Future) Writes decision hash to X Layer smart contract via OnchainOS
`}</CodeBlock>
          </section>

          {/* ── Web3 ── */}
          <section id="web3" className="mt-12">
            <SectionHeading id="web3">X Layer Blockchain Verification</SectionHeading>
            <P>
              Every AI claim decision is written onchain to X Layer (OKX's EVM-compatible L2 chain) via
              OKX OnchainOS. This creates an immutable, publicly verifiable record of every decision —
              making fraud disputes impossible to hide.
            </P>

            <H3>Smart Contract: InsuranceClaim.sol</H3>
            <CodeBlock>{`
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InsuranceClaim {
    struct ClaimRecord {
        uint256 claimId;
        address patient;
        bytes32 decisionHash;   // keccak256(decision + reasoning)
        bool    approved;
        uint256 timestamp;
    }

    mapping(uint256 => ClaimRecord) public claims;
    address public authorizedAgent;

    event ClaimDecided(
        uint256 indexed claimId,
        bool    approved,
        bytes32 decisionHash,
        uint256 timestamp
    );

    modifier onlyAgent() {
        require(msg.sender == authorizedAgent, "Unauthorized");
        _;
    }

    function recordDecision(
        uint256 claimId,
        address patient,
        bytes32 decisionHash,
        bool    approved
    ) external onlyAgent {
        claims[claimId] = ClaimRecord(
            claimId, patient, decisionHash, approved, block.timestamp
        );
        emit ClaimDecided(claimId, approved, decisionHash, block.timestamp);
    }
}
`}</CodeBlock>

            <P>
              Deployed on X Layer Testnet (chainId: 195). RPC: <InlineCode>https://testrpc.xlayer.tech</InlineCode>.
              Transaction hashes are stored in the <InlineCode>tx_hash</InlineCode> column of the Claims table
              and displayed in the UI with a direct link to the X Layer Explorer.
            </P>
          </section>

          {/* ── API Reference ── */}
          <section id="api-reference" className="mt-12">
            <SectionHeading id="api-reference">API Reference</SectionHeading>
            <P>
              ClearClaim uses a CQRS pattern — read operations hit the{" "}
              <InlineCode>ReadAPI (:5234)</InlineCode> (Dapper), write operations hit the{" "}
              <InlineCode>WriteAPI (:5130)</InlineCode> (EF Core). AI agents are on{" "}
              <InlineCode>port :8000–8002</InlineCode>.
            </P>

            <H3>Admin Endpoints</H3>
            <div className="card overflow-hidden mb-6">
              <div className="p-4">
                <ApiRow method="GET"  path="/api/admin/dashboard"              desc="Dashboard stats (total/pending/approved/rejected)" />
                <ApiRow method="GET"  path="/api/admin/claims/pending"          desc="All pending claims with AI fields" />
                <ApiRow method="PUT"  path="/api/admin/claims/approve/{id}"     desc="Approve a claim" />
                <ApiRow method="PUT"  path="/api/admin/claims/reject/{id}"      desc="Reject a claim" />
                <ApiRow method="GET"  path="/api/admin/customers/search"        desc="Search customers by city/profession/blood/disease" />
              </div>
            </div>

            <H3>Customer Endpoints</H3>
            <div className="card overflow-hidden mb-6">
              <div className="p-4">
                <ApiRow method="GET"  path="/api/customer/{id}/policies"        desc="Get all policies for a customer" />
                <ApiRow method="POST" path="/api/PolicyWrite"                   desc="Purchase a new policy" />
                <ApiRow method="POST" path="/api/ClaimWrite"                    desc="Submit a claim" />
                <ApiRow method="GET"  path="/api/plans/{planId}/hospitals"      desc="Get hospitals covered under a plan" />
                <ApiRow method="GET"  path="/api/PlanSearch"                    desc="Get all available plans" />
              </div>
            </div>

            <H3>AI Agent Endpoints</H3>
            <div className="card overflow-hidden">
              <div className="p-4">
                <ApiRow method="POST" path="/agent/process-claims"              desc="Run AI on all pending claims (Gemini)" />
                <ApiRow method="GET"  path="/agent/fraud-score/{claimId}"       desc="Get algorithmic fraud score (0–100)" />
                <ApiRow method="POST" path="/agent/recommend-policy"            desc="AI plan recommendation" />
                <ApiRow method="GET"  path="/agent/status"                      desc="Agent health check" />
              </div>
            </div>
          </section>

          {/* ── How Claims Work ── */}
          <section id="how-it-works" className="mt-12">
            <SectionHeading id="how-it-works">How Claims Work</SectionHeading>
            <P>
              The end-to-end claim lifecycle — from submission to onchain settlement — in 5 steps:
            </P>
            <ol className="space-y-4 mt-4">
              {[
                { n: "01", title: "Customer Submits Claim",    desc: "Customer selects their active policy, chooses a hospital covered under the plan, enters disease and amount. The AI Fraud Detector runs a preliminary risk check before submission." },
                { n: "02", title: "Claim Enters Pending Queue", desc: "Claim is stored in PostgreSQL with status = Pending. Seven DB triggers enforce business rules: claim amount ≤ remaining coverage, hospital must be in plan network, policy must be active." },
                { n: "03", title: "Admin Triggers AI Agent",    desc: "Admin clicks 'Run AI Agent'. The Claim Processor fetches all pending claims, enriches each with full customer/policy/hospital context from the database, and sends to Gemini 2.5 Flash." },
                { n: "04", title: "Gemini Makes Autonomous Decision", desc: "Gemini analyzes disease vs patient history, claim amount vs coverage, temporal fraud signals, and hospital validity. Returns: Approve / Reject / Flag + reasoning + confidence score." },
                { n: "05", title: "Decision Written Onchain",   desc: "The decision hash is written to the InsuranceClaim smart contract on X Layer. The transaction hash is stored in the Claims table and displayed in the UI as blockchain proof." },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex gap-4 p-4 rounded-xl" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
                  <span className="text-2xl font-bold font-mono shrink-0" style={{ color: "rgba(37,99,235,0.3)" }}>{n}</span>
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: S.text }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ── OKX Integration ── */}
          <section id="okx-integration" className="mt-12 mb-16">
            <SectionHeading id="okx-integration">OKX.AI Integration</SectionHeading>
            <P>
              ClearClaim AI is listed as an <strong style={{ color: S.text }}>Agent Service Provider (ASP)</strong> on{" "}
              <a href="https://www.okx.ai" target="_blank" rel="noreferrer" style={{ color: S.accent }}>OKX.AI</a> — the
              agent economy marketplace. Users on OKX.AI can hire ClearClaim AI's agents to process their insurance
              claims, paying per call in USDT via the x402 payment protocol.
            </P>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {[
                { label: "ASP Type",      value: "Agent-to-MCP (pay-per-call)",     color: "#60A5FA" },
                { label: "Payment",       value: "USDT via x402 protocol",           color: "#34D399" },
                { label: "Network",       value: "X Layer (OKB gas, zero fees)",      color: "#FBBF24" },
                { label: "Prize Tracks",  value: "Finance Copilot + Best Product",   color: "#A78BFA" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color }}>{label}</p>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </motion.article>
      </div>

      {/* Footer */}
      <div
        className="text-center py-6 text-xs"
        style={{ color: "#1E293B", borderTop: `1px solid ${S.border}` }}
      >
        ClearClaim AI · OKX.AI Genesis Hackathon 2026
      </div>
    </div>
  );
}
