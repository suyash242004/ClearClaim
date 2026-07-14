// pages/Demo.tsx — Public demo credentials page for hackathon judges
import { Link } from "react-router-dom";
import { Brain, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { useState } from "react";

const CREDENTIALS = [
  {
    role: "Customer Portal",
    color: "#34D399",
    fields: [
      { label: "Email", value: "suy@gmail.com" },
      { label: "Password", value: "password123" },
    ],
    path: "/login",
  },
  {
    role: "Admin Console",
    color: "#6366F1",
    fields: [
      { label: "Password", value: "ClearClaim@Admin2026" },
    ],
    path: "/login",
  },
  {
    role: "Hospital Portal",
    color: "#F59E0B",
    fields: [
      { label: "Hospital ID", value: "1" },
      { label: "Password", value: "hospital@2026" },
    ],
    path: "/login",
  },
];

const CONTRACTS = [
  { name: "InsuranceClaim", address: "0xB0Df35C3097B680B0e0D96721eaf2C012B8E447C" },
  { name: "RiskOracle",     address: "0xD1CAF7812321B0cf3F8568079F213042D8e284f6" },
  { name: "HealthGuardian", address: "0x07Fc775Aa387e0E8b71dB1053fF3977ec0a8302f" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="transition-colors" title="Copy">
      {copied
        ? <CheckCheck size={11} style={{ color: "#34D399" }} />
        : <Copy size={11} style={{ color: "#555" }} />
      }
    </button>
  );
}

export default function Demo() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: "#000" }}>
      {/* Nav */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 h-16">
        <Link to="/landing" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#fff" }}>
            <Brain size={14} color="#000" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">
            ClearClaim <span style={{ color: "#6366F1" }}>AI</span>
          </span>
        </Link>
        <Link to="/login" className="text-xs px-4 py-2 rounded-full font-medium text-black bg-white hover:bg-white/90 transition-colors">
          Go to Login →
        </Link>
      </div>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-4 inline-block" style={{ background: "#111", color: "#6366F1", border: "1px solid #6366F120" }}>
            OKX.AI Genesis Hackathon 2026
          </span>
          <h1 className="text-3xl font-bold text-white mt-4 mb-2" style={{ letterSpacing: "-0.02em" }}>Demo Credentials</h1>
          <p className="text-sm" style={{ color: "#888899" }}>
            Use these to explore ClearClaim AI. All data is on X Layer Testnet.
          </p>
        </div>

        {/* Credentials */}
        <div className="space-y-3 mb-8">
          {CREDENTIALS.map((cred) => (
            <div key={cred.role} className="rounded-2xl p-5" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: cred.color }} />
                <span className="text-sm font-semibold text-white">{cred.role}</span>
                <Link to={cred.path} className="ml-auto text-xs flex items-center gap-1 transition-colors hover:text-white" style={{ color: cred.color }}>
                  Login <ExternalLink size={10} />
                </Link>
              </div>
              <div className="space-y-2">
                {cred.fields.map((f) => (
                  <div key={f.label} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "#555" }}>{f.label}</span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs px-2 py-1 rounded font-mono" style={{ background: "#0a0a0a", color: "#e2e8f0", border: "1px solid #222" }}>
                        {f.value}
                      </code>
                      <CopyButton text={f.value} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Smart Contracts */}
        <div className="rounded-2xl p-5" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
          <h2 className="text-sm font-semibold text-white mb-4">Smart Contracts — X Layer Testnet</h2>
          <div className="space-y-3">
            {CONTRACTS.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-4">
                <span className="text-xs" style={{ color: "#555" }}>{c.name}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://web3.okx.com/explorer/x-layer-testnet/address/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono transition-colors hover:text-white"
                    style={{ color: "#6366F1" }}
                  >
                    {c.address.slice(0, 10)}…{c.address.slice(-6)}
                  </a>
                  <CopyButton text={c.address} />
                  <a
                    href={`https://web3.okx.com/explorer/x-layer-testnet/address/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={11} style={{ color: "#333" }} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "#222" }}>
          Agent API: <code style={{ color: "#444" }}>http://localhost:8000/agent/status</code>
          {" · "}Built on X Layer · Powered by Gemini 2.5 Flash
        </p>
      </div>
    </div>
  );
}
