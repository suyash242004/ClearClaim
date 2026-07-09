// TxHashLink.tsx — Blockchain tx hash with copy + X Layer Explorer link
import { useState } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";

interface Props {
  hash: string | null | undefined;
}

export default function TxHashLink({ hash }: Props) {
  const [copied, setCopied] = useState(false);

  if (!hash) {
    return <span className="text-xs" style={{ color: "#2A3A56" }}>—</span>;
  }

  const short = `${hash.slice(0, 8)}...${hash.slice(-6)}`;

  const copy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs font-mono" style={{ color: "#00D4FF" }}>{short}</span>
      <button onClick={copy} className="transition-opacity hover:opacity-100 opacity-60">
        {copied ? <Check size={11} color="#00C896" /> : <Copy size={11} color="#00D4FF" />}
      </button>
      <a
        href={`https://explorer.xlayer.tech/tx/${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-100 opacity-60"
      >
        <ExternalLink size={11} color="#00D4FF" />
      </a>
    </span>
  );
}
