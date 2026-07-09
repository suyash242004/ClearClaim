// Landing.tsx — Full product landing page (Ghast + Anima inspired)
// Sections: Hero · How it works · Stats · CTA footer
// Uses Instrument Serif for display headlines, dot-grid bg, scroll animations

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Brain, Shield, Zap, Link2, Bot,
  Activity, CheckCircle2, FileSearch
} from "lucide-react";
import LandingNav from "../components/LandingNav";

const features = [
  {
    num: "01",
    title: "AI Claim Processor",
    desc: "Gemini 2.5 Flash reads your policy, validates disease, detects fraud patterns. Autonomous decisions in seconds.",
    icon: Brain,
  },
  {
    num: "02",
    title: "Onchain Verification",
    desc: "Every decision hash written to X Layer. Immutable. Verifiable by anyone. Trust without intermediaries.",
    icon: Link2,
  },
  {
    num: "03",
    title: "Zero Human Delays",
    desc: "Claims approved in seconds, not days. Blockchain tx hash as proof. No back-and-forth paperwork.",
    icon: Zap,
  },
  {
    num: "04",
    title: "Finance Copilot",
    desc: "AI recommends the right plan. Fraud scored before submission. Your personal insurance advisor.",
    icon: Shield,
  },
];

const stats = [
  { value: "₹2.4Cr", label: "Claims Processed" },
  { value: "94%", label: "AI Accuracy" },
  { value: "3", label: "Autonomous Agents" },
  { value: "0", label: "Manual Reviews" },
];

// Fake terminal lines for the product mockup
const terminalLines = [
  { type: "info", text: "▸ ClearClaim AI Agent v1.0 initialized" },
  { type: "info", text: "▸ Connected to X Layer Testnet (chainId: 195)" },
  { type: "process", text: "⟳ Processing Claim #1042 — Disease: Cardiac Surgery" },
  { type: "process", text: "⟳ Fraud Score: 0.12 (LOW RISK)" },
  { type: "success", text: "✓ AI Decision: APPROVED — Confidence: 94.7%" },
  { type: "success", text: "✓ Tx Hash: 0x8a3f...e7b2 written to X Layer" },
  { type: "info", text: "▸ Waiting for next claim..." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#080810" }}>
      <LandingNav />

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — HERO
          ════════════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex items-center bg-dot-grid overflow-hidden"
        id="insurance"
      >
        {/* Subtle gradient overlay at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
          style={{ background: "linear-gradient(to top, #080810, transparent)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full pt-32 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — Hero text */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              {/* Label */}
              <p
                className="text-xs font-medium tracking-[0.2em] uppercase mb-8"
                style={{ color: "#888899" }}
              >
                Medical Insurance · Reimagined
              </p>

              {/* Massive headline — serif italic + sans mix */}
              <h1
                className="font-bold leading-[0.95] mb-8"
                style={{
                  fontSize: "clamp(56px, 7vw, 110px)",
                  color: "#fff",
                  letterSpacing: "-0.03em",
                }}
              >
                Autonomous
                <br />
                <span className="font-serif-italic" style={{ fontWeight: 400 }}>
                  claims
                </span>
                <br />
                on X Layer.
              </h1>

              {/* Subtitle */}
              <p
                className="text-base leading-relaxed max-w-md mb-10"
                style={{ color: "#888899" }}
              >
                AI agents process, verify, and settle medical insurance claims
                onchain. No human admin. No delays. Every decision — immutable.
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => navigate("/login")}
                  className="btn-ghast text-sm px-7 py-3"
                >
                  Launch App <ArrowRight size={14} />
                </button>
                <a
                  href="/docs"
                  className="btn-ghast-dark text-sm px-7 py-3"
                >
                  Read the docs
                </a>
              </div>
            </motion.div>

            {/* Right — Floating product mockup (terminal style) */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="hidden lg:block"
            >
              <div className="terminal-chrome" style={{ transform: "perspective(1200px) rotateY(-3deg) rotateX(2deg)" }}>
                {/* Window header */}
                <div className="terminal-chrome-header">
                  <div className="terminal-chrome-dot" style={{ background: "#FF5F57" }} />
                  <div className="terminal-chrome-dot" style={{ background: "#FEBC2E" }} />
                  <div className="terminal-chrome-dot" style={{ background: "#28C840" }} />
                  <span className="ml-3 text-xs" style={{ color: "#555" }}>
                    AI Agent — ClearClaim v1.0
                  </span>
                </div>
                {/* Terminal lines */}
                <div className="p-5 space-y-1.5" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12px", lineHeight: 1.7 }}>
                  {terminalLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      style={{
                        color:
                          line.type === "success" ? "#34D399" :
                          line.type === "process" ? "#A78BFA" :
                          "#60A5FA"
                      }}
                    >
                      {line.text}
                    </motion.div>
                  ))}
                  <div className="flex items-center gap-1 mt-2">
                    <span style={{ color: "#34D399" }}>❯</span>
                    <span className="animate-blink" style={{ color: "#F8FAFC" }}>_</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — HOW IT WORKS (Ghast numbered feature list)
          ════════════════════════════════════════════════════════════ */}
      <section className="py-32 relative" id="agents">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-24 items-start">
            {/* Left — Section heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <p
                className="text-xs font-medium tracking-[0.2em] uppercase mb-4"
                style={{ color: "#6366F1" }}
              >
                How It Works
              </p>
              <h2
                className="font-bold leading-tight"
                style={{ fontSize: "clamp(36px, 4vw, 56px)", color: "#fff", letterSpacing: "-0.02em" }}
              >
                Four agents.
                <br />
                <span className="font-serif-italic" style={{ fontWeight: 400, color: "#888899" }}>
                  Zero friction.
                </span>
              </h2>
              <p className="mt-6 text-sm leading-relaxed max-w-sm" style={{ color: "#555" }}>
                From claim submission to onchain settlement — every step is
                autonomous, transparent, and cryptographically verified.
              </p>
            </motion.div>

            {/* Right — Numbered feature list */}
            <div>
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.num}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="flex gap-6 py-8">
                      <span
                        className="text-xs font-mono font-bold shrink-0 mt-1"
                        style={{ color: "#6366F1" }}
                      >
                        {feature.num}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon size={16} style={{ color: "#fff" }} />
                          <h3 className="text-base font-semibold" style={{ color: "#fff" }}>
                            {feature.title}
                          </h3>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "#888899" }}>
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                    {i < features.length - 1 && (
                      <div style={{ height: "1px", background: "#1a1a1a" }} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3 — STATS (Anima-style, warm bg)
          ════════════════════════════════════════════════════════════ */}
      <section className="section-warm py-28" id="blockchain">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-medium tracking-[0.2em] uppercase mb-4" style={{ color: "#999" }}>
              By the Numbers
            </p>
            <h2
              className="font-bold"
              style={{ fontSize: "clamp(32px, 4vw, 48px)", color: "#111", letterSpacing: "-0.02em" }}
            >
              Built for scale.{" "}
              <span className="font-serif-italic" style={{ fontWeight: 400 }}>Proven on chain.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="text-center"
              >
                <p
                  className="font-bold mb-2"
                  style={{ fontSize: "clamp(40px, 5vw, 64px)", color: "#111", letterSpacing: "-0.02em" }}
                >
                  {stat.value}
                </p>
                <p className="text-sm font-medium" style={{ color: "#888" }}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 4 — ARCHITECTURE CARDS
          ════════════════════════════════════════════════════════════ */}
      <section className="py-32" style={{ background: "#080810" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-medium tracking-[0.2em] uppercase mb-4" style={{ color: "#6366F1" }}>
              Architecture
            </p>
            <h2
              className="font-bold"
              style={{ fontSize: "clamp(32px, 4vw, 48px)", color: "#fff", letterSpacing: "-0.02em" }}
            >
              Enterprise-grade.{" "}
              <span className="font-serif-italic" style={{ fontWeight: 400, color: "#888899" }}>
                Hackathon speed.
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: "3 AI Agents",
                desc: "Claim Processor, Fraud Detector, and Policy Advisor — each powered by Gemini 2.5 Flash with specialized prompts.",
                accent: "#6366F1",
              },
              {
                icon: Activity,
                title: "9-Layer Clean Architecture",
                desc: "CQRS pattern with Dapper reads + EF Core writes. Two independent .NET APIs on ports 5234 and 5130.",
                accent: "#34D399",
              },
              {
                icon: FileSearch,
                title: "X Layer Smart Contracts",
                desc: "InsuranceClaim.sol deployed on X Layer testnet. Every AI decision gets a permanent, verifiable onchain record.",
                accent: "#F59E0B",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="spotlight-card p-8"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
                  }}
                >
                  <div className="relative z-10">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}30` }}
                    >
                      <Icon size={18} style={{ color: card.accent }} />
                    </div>
                    <h3 className="text-base font-semibold mb-3" style={{ color: "#fff" }}>
                      {card.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#888899" }}>
                      {card.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5 — CTA FOOTER
          ════════════════════════════════════════════════════════════ */}
      <section className="py-32 text-center" style={{ background: "#080810" }}>
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2
              className="font-bold mb-6"
              style={{
                fontSize: "clamp(36px, 5vw, 64px)",
                color: "#fff",
                letterSpacing: "-0.03em",
              }}
            >
              The future of insurance
              <br />
              <span className="font-serif-italic" style={{ fontWeight: 400 }}>
                is autonomous.
              </span>
            </h2>
            <p className="text-sm mb-10 max-w-md mx-auto" style={{ color: "#888899" }}>
              Join the first medical insurance platform powered entirely by
              AI agents and verified on blockchain.
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn-ghast text-sm px-8 py-3.5"
            >
              Launch App <ArrowRight size={14} />
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <div
          className="max-w-7xl mx-auto px-6 lg:px-8 mt-32 pt-8 flex items-center justify-between flex-wrap gap-4"
          style={{ borderTop: "1px solid #1a1a1a" }}
        >
          <div className="flex items-center gap-2">
            <Brain size={14} style={{ color: "#fff" }} />
            <span className="text-xs font-semibold" style={{ color: "#fff" }}>
              ClearClaim AI
            </span>
          </div>
          <p className="text-xs" style={{ color: "#555" }}>
            Built for OKX.AI Genesis Hackathon 2026 · Powered by Gemini & X Layer
          </p>
          <div className="flex items-center gap-6">
            {["GitHub", "Docs", "X Layer"].map((link) => (
              <a
                key={link}
                href={link === "Docs" ? "/docs" : "#"}
                className="text-xs transition-colors"
                style={{ color: "#555" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
