// Docs.tsx — Vercel/Stripe-style documentation page
// Sidebar scroll-spy, plain-language content, kept in sync with the live platform.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Brain, Bot, Shield, Code, Zap,
  BookOpen, Activity, ChevronRight, Rocket, ExternalLink
} from "lucide-react";
import TerminalWindow from "../components/TerminalWindow";

// ── Sidebar sections ─────────────────────────────────────────────
const sections = [
  { id: "overview",        label: "Overview",             icon: BookOpen },
  { id: "getting-started", label: "Getting Started",      icon: Rocket },
  { id: "ai-agents",       label: "The 11 AI Agents",     icon: Bot },
  { id: "how-it-works",    label: "How a Claim Works",    icon: Activity },
  { id: "web3",            label: "X Layer Blockchain",   icon: Shield },
  { id: "api-reference",   label: "API Reference",        icon: Code },
  { id: "okx-integration", label: "OKX.AI Marketplace",   icon: Zap },
] as const;

type SectionId = typeof sections[number]["id"];

// ── Colour tokens ────────────────────────────────────────────────
const S = {
  bg: "#080810",
  surface: "#111",
  border: "rgba(255,255,255,0.06)",
  text: "#F8FAFC",
  muted: "#64748B",
  accent: "#6366F1",
};

// ── Building blocks ──────────────────────────────────────────────
function CodeBlock({ children }: { children: string }) {
  return (
    <TerminalWindow className="my-6 shadow-2xl">
      <pre className="overflow-x-auto text-xs" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: "#A5B4FC", lineHeight: 1.7 }}>
        <code>{children.trim()}</code>
      </pre>
    </TerminalWindow>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-3xl font-bold mt-16 mb-6 font-serif-display tracking-wide scroll-mt-24" style={{ color: S.text }}>
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

function ApiRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColor: Record<string, string> = {
    GET: "#34D399", POST: "#60A5FA", PUT: "#FBBF24", DELETE: "#F87171"
  };
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5 border-b" style={{ borderColor: S.border }}>
      <span className="text-xs font-mono font-bold shrink-0 w-12" style={{ color: methodColor[method] ?? "#94A3B8" }}>
        {method}
      </span>
      <code className="text-xs font-mono shrink-0" style={{ color: "#93C5FD" }}>{path}</code>
      <span className="text-xs" style={{ color: S.muted }}>{desc}</span>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────
const agents = [
  { n: 1,  name: "Claim Processor",       what: "Reads a pending claim, checks it against the policy and medical history, and decides Approve / Reject / Flag — with written reasoning.", color: "#6366F1" },
  { n: 2,  name: "Fraud Detector",        what: "Instantly scores every claim 0–100 for fraud risk using seven rules (timing, frequency, amount, history mismatch). No AI model needed — pure logic, instant answer.", color: "#F59E0B" },
  { n: 3,  name: "Policy Advisor",        what: "Tell it your age, family size and budget — it recommends the best plan and explains why in plain language.", color: "#10B981" },
  { n: 4,  name: "LangGraph Orchestrator", what: "The production pipeline. Runs every step of a claim in order, saves its progress to disk after each step, and pauses for a human when it isn't confident.", color: "#818CF8" },
  { n: 5,  name: "Predictive Risk",       what: "Every night at 2 AM it reviews all customers and predicts who is likely to need care in the coming months.", color: "#F472B6" },
  { n: 6,  name: "Health Guardian",       what: "When someone is flagged high-risk, it automatically writes them a personalized 90-day preventive care plan.", color: "#34D399" },
  { n: 7,  name: "Hospital Assistant",    what: "Helps hospital staff: assigns ICD-10 codes, lists required documents, flags rejection risks, and pre-authorizes admissions.", color: "#FBBF24" },
  { n: 8,  name: "Health Passport",       what: "Mints a soulbound (non-transferable) health record on the blockchain that follows the patient across insurers.", color: "#60A5FA" },
  { n: 9,  name: "Chat Concierge",        what: "The chat bubble in the app. It can look up your real claims, policies and care plan — and answers with live data.", color: "#A78BFA" },
  { n: 10, name: "RLHF Self-Learning",    what: "Whenever a human overrides an AI decision, this agent studies the correction overnight and turns it into a new rule for future decisions.", color: "#F87171" },
  { n: 11, name: "Legacy Pipeline",       what: "The original claim pipeline, kept as a fallback path.", color: "#64748B" },
];

const contracts = [
  { name: "InsuranceClaim",  addr: "0xed7c36ce8EB540e35604a9eeFa72f3b19106A709", what: "Every AI decision hash, verdict and confidence" },
  { name: "RiskOracle",      addr: "0x428bE934f782D0Ba4556cB84680bDe233d07cc1a", what: "Predicted health-risk scores, tamper-proof" },
  { name: "HealthGuardian",  addr: "0x0F4FEB6E515eEEb90bed9E6cC10f556a6c7287dE", what: "Proof the AI intervened before claims happened" },
  { name: "HealthPassport",  addr: "0x63cC01DDC2aCd8a230679E29A7Be7EBe5769f3E3", what: "Soulbound patient health record" },
  { name: "PremiumVault",    addr: "0xd97177B7268624b4949fd265245E74A51633bcd0", what: "Accepts premium payments in OKB" },
];

// ── Main component ────────────────────────────────────────────────
export default function Docs() {
  const [active, setActive] = useState<SectionId>("overview");

  // Scroll-spy: highlight the section currently in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

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
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#fff" }}>
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
                  background: active === id ? "rgba(99,102,241,0.1)" : "transparent",
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
              <BookOpen size={12} /> Documentation v3.0
            </div>
            <h1 className="text-5xl font-bold mb-4 font-serif-display tracking-wide" style={{ color: S.text }}>
              Welcome to ClearClaim <span className="gradient-text-indigo font-sans tracking-tight">AI</span>
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "#94A3B8" }}>
              Autonomous medical insurance: 11 AI agents that process claims in seconds, predict health
              risks before they become claims, and record every decision on the blockchain.
            </p>
          </div>

          <hr style={{ borderColor: S.border, marginBottom: "2.5rem" }} />

          {/* ── Overview ── */}
          <section>
            <SectionHeading id="overview">Overview</SectionHeading>
            <P>
              Traditional insurance makes you wait days for a claim decision and never tells you why.
              ClearClaim AI flips that: a claim is checked against real policy rules, scored for fraud,
              decided by AI with written reasoning — and the decision is recorded on the X Layer blockchain,
              where anyone can verify it. All in seconds.
            </P>
            <P>
              A human is involved only when the AI isn't confident — low-confidence, high-fraud, or
              high-value claims pause in a review queue for an admin. Everything else runs autonomously,
              24/7, including overnight health-risk scans that generate preventive care plans before
              illness turns into a claim.
            </P>
            <div className="grid sm:grid-cols-3 gap-3 mt-8">
              {[
                { label: "AI Agents", value: "11 agents · LangGraph workflow",  color: "#6366F1" },
                { label: "AI Model",  value: "Google Gemini 3.5 Flash",         color: "#F59E0B" },
                { label: "Backend",   value: ".NET 8 · Clean Architecture",     color: "#A78BFA" },
                { label: "Database",  value: "PostgreSQL 16 (Neon)",            color: "#10B981" },
                { label: "Frontend",  value: "React 18 + TypeScript",           color: "#60A5FA" },
                { label: "Blockchain", value: "X Layer · 5 live contracts",     color: "#34D399" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 rounded-xl transition-colors hover:border-indigo-500/30" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color }}>{label}</p>
                  <p className="text-sm font-medium" style={{ color: "#F8FAFC" }}>{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Getting Started ── */}
          <section className="mt-12">
            <SectionHeading id="getting-started">Getting Started</SectionHeading>
            <P>
              ClearClaim has three portals — pick your role and log in. Demo credentials are on the{" "}
              <Link to="/demo" style={{ color: S.accent }}>demo credentials page</Link>.
            </P>
            <div className="space-y-3 mt-4">
              {[
                { role: "Customer", color: "#34D399", steps: "Browse plans → get an AI recommendation → purchase → submit a claim in 3 steps → track its AI decision, fraud score and blockchain proof in My Claims. The chat bubble answers questions using your real data." },
                { role: "Admin", color: "#6366F1", steps: "Watch the AI process claims live in the dashboard terminal → review anything the AI paused on in the Review Queue → replay any decision step-by-step → see each agent's earnings in Economics." },
                { role: "Hospital", color: "#F59E0B", steps: "See all claims filed at your hospital → run the AI Clinical Assistant on any claim for ICD-10 codes, document checklists and rejection red-flags → look up patient coverage before admission." },
              ].map(({ role, color, steps }) => (
                <div key={role} className="p-4 rounded-xl" style={{ background: S.surface, border: `1px solid ${color}22` }}>
                  <p className="text-sm font-semibold mb-1.5" style={{ color }}>{role}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{steps}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── AI Agents ── */}
          <section className="mt-12">
            <SectionHeading id="ai-agents">The 11 AI Agents</SectionHeading>
            <P>
              All agents run behind one gateway. Each has a single job, and they hand work to each
              other — no human coordination needed.
            </P>
            <div className="space-y-2 mt-4">
              {agents.map(({ n, name, what, color }) => (
                <div key={n} className="flex gap-4 p-3.5 rounded-xl" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
                  <span className="text-xs font-mono font-bold shrink-0 mt-0.5 w-6 text-right" style={{ color }}>
                    {String(n).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: S.text }}>{name}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{what}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── How a Claim Works ── */}
          <section className="mt-12">
            <SectionHeading id="how-it-works">How a Claim Works</SectionHeading>
            <P>
              Every claim travels through a checkpointed pipeline. After each step, progress is saved to
              disk — if the server crashes mid-claim, it resumes from the exact step it stopped on.
            </P>
            <ol className="space-y-4 mt-4">
              {[
                { n: "01", title: "Claim submitted",        desc: "The customer picks a policy and network hospital, enters the illness and amount, and sees a fraud-risk preview before confirming." },
                { n: "02", title: "Rules gate (no AI yet)",  desc: "The claim is first checked against real IRDAI insurance rules — waiting periods, permanent exclusions, coverage limits, co-pay. A rule violation is rejected instantly, citing the exact clause." },
                { n: "03", title: "Fraud score",             desc: "Seven algorithmic rules score the claim 0–100: suspicious timing, claim frequency, amount vs coverage, history mismatch. Very high scores are auto-rejected without spending an AI call." },
                { n: "04", title: "AI adjudication",         desc: "Gemini 3.5 Flash reviews everything — patient history, policy math from the rules gate, fraud indicators, retrieved policy clauses — and decides, with written reasoning and a confidence score." },
                { n: "05", title: "Human checkpoint (only if needed)", desc: "If confidence is low, fraud is high, or the amount is above ₹5,00,000, the pipeline pauses. An admin sees it in the Review Queue and approves or rejects — the pipeline then resumes exactly where it paused." },
                { n: "06", title: "Onchain settlement",      desc: "The final decision is hashed and written to the InsuranceClaim contract on X Layer. The transaction hash appears in the UI — anyone can verify it on the block explorer." },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex gap-4 p-4 rounded-xl" style={{ background: S.surface, border: `1px solid ${S.border}` }}>
                  <span className="text-2xl font-bold font-mono shrink-0" style={{ color: "rgba(99,102,241,0.35)" }}>{n}</span>
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: S.text }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <H3>The pipeline, at a glance</H3>
            <CodeBlock>{`
Claim submitted
  └─▶ IRDAI Rules Gate        instant, cites the exact clause on rejection
       └─▶ Fraud Detector      0–100 score, seven rules, no AI cost
            └─▶ AI Adjudication  Gemini 3.5 Flash + policy clauses
                 ├─▶ confident ──▶ recorded on X Layer ──▶ settled ✅
                 └─▶ uncertain / high-value ──▶ HUMAN REVIEW QUEUE ⏸
                          └─ admin decides → pipeline resumes from that exact step
`}</CodeBlock>
          </section>

          {/* ── Web3 ── */}
          <section className="mt-12">
            <SectionHeading id="web3">X Layer Blockchain</SectionHeading>
            <P>
              Five smart contracts are live on X Layer Testnet (chainId <InlineCode>1952</InlineCode>).
              Together they make the platform verifiable: decisions, risk scores, care interventions and
              premium payments all leave a permanent public record no one can edit — not even us.
            </P>
            <div className="space-y-2 mt-4">
              {contracts.map(({ name, addr, what }) => (
                <a
                  key={name}
                  href={`https://www.oklink.com/xlayer-test/address/${addr}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3.5 rounded-xl transition-colors hover:border-indigo-500/40 group"
                  style={{ background: S.surface, border: `1px solid ${S.border}` }}
                >
                  <span className="text-sm font-semibold w-36 shrink-0" style={{ color: S.text }}>{name}</span>
                  <code className="text-[11px] font-mono" style={{ color: "#93C5FD" }}>
                    {addr.slice(0, 10)}…{addr.slice(-6)}
                  </code>
                  <span className="text-xs flex-1" style={{ color: S.muted }}>{what}</span>
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: S.accent }} />
                </a>
              ))}
            </div>
            <P>
              <span style={{ color: S.muted }}>
                Every card links to the live contract on the X Layer explorer — click to verify.
                Contracts are covered by a 70-test suite. Blockchain writes are best-effort by design:
                if the chain is unreachable, the claim still settles and the record syncs later.
              </span>
            </P>
          </section>

          {/* ── API Reference ── */}
          <section className="mt-12">
            <SectionHeading id="api-reference">API Reference</SectionHeading>
            <P>
              Reads go to the <InlineCode>ReadAPI :5234</InlineCode>, writes to the{" "}
              <InlineCode>WriteAPI :5130</InlineCode>, and all AI agents share one gateway on{" "}
              <InlineCode>:8000</InlineCode> (interactive Swagger docs at <InlineCode>/docs</InlineCode>).
            </P>

            <H3>Claims & Admin</H3>
            <div className="card overflow-hidden mb-6">
              <div className="p-4">
                <ApiRow method="POST" path="/api/claims/submit"               desc="Submit a claim (query params)" />
                <ApiRow method="GET"  path="/api/admin/claims/with-ai"        desc="All claims with AI decision, fraud score, tx hash" />
                <ApiRow method="PUT"  path="/api/admin/claims/approve/{id}"   desc="Approve a claim" />
                <ApiRow method="PUT"  path="/api/admin/claims/reject/{id}"    desc="Reject a claim" />
                <ApiRow method="GET"  path="/api/admin/dashboard"             desc="Claim statistics" />
              </div>
            </div>

            <H3>Customers & Plans</H3>
            <div className="card overflow-hidden mb-6">
              <div className="p-4">
                <ApiRow method="POST" path="/api/CustomerWrite"               desc="Register a customer" />
                <ApiRow method="GET"  path="/api/customer/{id}/policies"      desc="A customer's policies" />
                <ApiRow method="POST" path="/api/policies/purchase"           desc="Purchase a policy (query params)" />
                <ApiRow method="GET"  path="/api/InsuranceplanRead"           desc="All available plans" />
                <ApiRow method="GET"  path="/api/plans/{planId}/hospitals"    desc="Hospitals in a plan's network" />
              </div>
            </div>

            <H3>AI Agent Gateway (:8000)</H3>
            <div className="card overflow-hidden">
              <div className="p-4">
                <ApiRow method="POST" path="/agent/graph/run/{claimId}"       desc="Run the full checkpointed claim pipeline" />
                <ApiRow method="GET"  path="/agent/graph/review-queue"        desc="Claims paused for human review" />
                <ApiRow method="POST" path="/agent/graph/resume/{threadId}"   desc="Admin decision — pipeline resumes" />
                <ApiRow method="GET"  path="/agent/traces/{claimId}"          desc="Step-by-step decision replay (audit trail)" />
                <ApiRow method="GET"  path="/agent/fraud-score/{claimId}"     desc="Instant 0–100 fraud score" />
                <ApiRow method="POST" path="/agent/recommend-policy"          desc="AI plan recommendation" />
                <ApiRow method="POST" path="/agent/chat"                      desc="Chat concierge with live data access" />
                <ApiRow method="GET"  path="/agent/economics/pnl"             desc="Per-agent revenue vs compute cost" />
                <ApiRow method="GET"  path="/agent/metrics"                   desc="Live platform metrics" />
                <ApiRow method="GET"  path="/agent/status"                    desc="Gateway health + all 11 agents" />
              </div>
            </div>
          </section>

          {/* ── OKX Integration ── */}
          <section className="mt-12 mb-16">
            <SectionHeading id="okx-integration">OKX.AI Marketplace</SectionHeading>
            <P>
              ClearClaim AI is registered as <strong style={{ color: S.text }}>Agent #5967</strong> on{" "}
              <a href="https://www.okx.ai/agents" target="_blank" rel="noreferrer" style={{ color: S.accent }}>OKX.AI</a> —
              the marketplace where AI agents offer services to people and to other agents. Its identity
              is recorded onchain, and other agents can call its services directly through the MCP
              endpoint — no human in the middle.
            </P>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {[
                { label: "Agent ID",       value: "#5967 · registered onchain",        color: "#60A5FA" },
                { label: "Service Type",   value: "Agent-to-MCP (direct API calls)",   color: "#34D399" },
                { label: "Live Services",  value: "Claim adjudication · Fraud scoring · Plan advice", color: "#FBBF24" },
                { label: "MCP Endpoint",   value: "/mcp/tools · /mcp/invoke",          color: "#A78BFA" },
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
            <P>
              <span style={{ color: S.muted }}>
                Every marketplace call is booked into a live profit-and-loss ledger — see it on the
                Admin → Economics dashboard.
              </span>
            </P>
          </section>

        </motion.article>
      </div>

      {/* Footer */}
      <div
        className="text-center py-6 text-xs"
        style={{ color: "#334155", borderTop: `1px solid ${S.border}` }}
      >
        ClearClaim AI · OKX.AI Genesis Hackathon 2026
      </div>
    </div>
  );
}
