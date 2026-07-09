// TerminalWindow.tsx — macOS-style terminal chrome wrapper
// Renders a fake window header with red/yellow/green dots + title
// Used to wrap AgentStatusPanel on the admin dashboard

import type { ReactNode } from "react";

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function TerminalWindow({ title = "Terminal", children, className = "" }: Props) {
  return (
    <div className={`terminal-chrome ${className}`}>
      {/* Window header */}
      <div className="terminal-chrome-header">
        <div className="terminal-chrome-dot" style={{ background: "#FF5F57" }} />
        <div className="terminal-chrome-dot" style={{ background: "#FEBC2E" }} />
        <div className="terminal-chrome-dot" style={{ background: "#28C840" }} />
        <span
          className="ml-2 text-xs font-medium"
          style={{ color: "#555", fontFamily: "'Inter', sans-serif" }}
        >
          {title}
        </span>
      </div>

      {/* Terminal content */}
      <div className="p-4">{children}</div>
    </div>
  );
}
