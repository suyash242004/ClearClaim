// AgentStatusPanel.tsx — Terminal-style real-time AI processing feed
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, CheckCircle, XCircle, AlertTriangle, Loader2, Terminal } from "lucide-react";
import type { ClaimDecision } from "../services/AgentHttpService";

interface Props {
  logs: LogEntry[];
  isRunning: boolean;
}

export interface LogEntry {
  id: number;
  message: string;
  type: "info" | "success" | "error" | "warning" | "processing";
  timestamp: string;
}

export function createLog(
  id: number,
  message: string,
  type: LogEntry["type"]
): LogEntry {
  return {
    id,
    message,
    type,
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

export function decisionsToLogs(decisions: ClaimDecision[]): LogEntry[] {
  return decisions.map((d, i) => ({
    id: i + 100,
    message: `Claim #${d.claim_id} → ${d.decision.toUpperCase()} · Confidence: ${Math.round(d.confidence_score * 100)}%${d.fraud_indicators.length > 0 ? " · ⚠ " + d.fraud_indicators[0] : " · ✓ Clean"}`,
    type:
      d.decision === "Approve" ? "success" :
      d.decision === "Reject"  ? "error"   : "warning",
    timestamp: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }),
  }));
}

// Prefix labels + colors per type
const typeConfig = {
  info:       { label: "[INFO]",    color: "#60A5FA" },
  success:    { label: "[OK]  ",    color: "#34D399" },
  error:      { label: "[ERR] ",    color: "#F87171" },
  warning:    { label: "[WARN]",    color: "#FBBF24" },
  processing: { label: "[PROC]",    color: "#A78BFA" },
};

export default function AgentStatusPanel({ logs, isRunning }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="terminal rounded-xl overflow-hidden" style={{ height: 300 }}>
      {/* macOS-style header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#030507" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#F87171" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#FBBF24" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#34D399" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <Terminal size={11} style={{ color: "#475569" }} />
            <span className="text-xs" style={{ color: "#475569", fontFamily: "inherit" }}>
              clearclaim-ai-agent
            </span>
          </div>
        </div>
        {isRunning ? (
          <div className="flex items-center gap-1.5">
            <Loader2 size={11} color="#A78BFA" className="animate-spin" />
            <span className="text-xs" style={{ color: "#A78BFA", fontFamily: "inherit" }}>processing…</span>
          </div>
        ) : logs.length > 0 ? (
          <span className="text-xs" style={{ color: "#475569", fontFamily: "inherit" }}>
            {logs.length} events
          </span>
        ) : null}
      </div>

      {/* Log output area */}
      <div className="p-4 h-[calc(100%-44px)] overflow-y-auto space-y-1">
        {logs.length === 0 && (
          <div className="flex items-center gap-2 h-full">
            <Bot size={14} style={{ color: "#1E293B" }} />
            <span className="text-xs" style={{ color: "#1E293B", fontFamily: "inherit" }}>
              $ waiting for agent instructions...
            </span>
            <span className="w-2 h-3.5 inline-block animate-blink" style={{ background: "#334155" }} />
          </div>
        )}

        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const tc = typeConfig[log.type];
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-2 text-xs leading-5"
              >
                <span style={{ color: "#334155", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  {log.timestamp}
                </span>
                <span style={{ color: tc.color, fontFamily: "inherit", whiteSpace: "nowrap", minWidth: 48 }}>
                  {tc.label}
                </span>
                <span style={{ color: tc.color, fontFamily: "inherit", opacity: 0.9, wordBreak: "break-word" }}>
                  {log.message}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isRunning && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-2 h-3.5 align-middle ml-1"
            style={{ background: "#A78BFA" }}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
