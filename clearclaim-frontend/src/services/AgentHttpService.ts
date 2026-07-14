import axios from "axios";

// Agent API — Python FastAPI running on port 8000 (unified gateway)
const agentApi = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 120000, // 2-min timeout for Gemini processing
  headers: { "Content-Type": "application/json" },
});

export interface ClaimDecision {
  claim_id: number;
  decision: "Approve" | "Reject" | "Flag";
  reasoning: string;
  confidence_score: number;
  fraud_indicators: string[];
  tx_hash?: string | null;
}

export interface FraudScore {
  claim_id: number;
  score: number;
  risk_level: "Low" | "Medium" | "High";
  indicators: string[];
}

export interface PolicyRecommendation {
  recommended_plan_id: number;
  recommended_plan_name: string;
  reasoning: string;
  confidence_score: number;
}

export interface PolicyRecommendationRequest {
  age: number;
  family_size: number;
  budget: number;
  medical_history: string;
  city: string;
}

export interface SSEEvent {
  type: "start" | "processing" | "result" | "complete" | "error";
  claim_id?: number;
  message?: string;
  decision?: string;
  reasoning?: string;
  confidence_score?: number;
  fraud_indicators?: string[];
  tx_hash?: string | null;
  total?: number;
  approved?: number;
  rejected?: number;
  flagged?: number;
}

export interface RiskScanResult {
  customer_id: number;
  customer_name: string;
  risk_score: number;
  risk_level: string;
  predicted_conditions: string[];
  risk_factors: string[];
  recommended_action: string;
  urgency: string;
  guardian_triggered: boolean;
}

export interface RecommendedTest {
  test: string;
  reason: string;
  frequency: string;
  covered: boolean;
}

export interface CarePlanResponse {
  customer_id: number;
  customer_name: string;
  greeting: string;
  summary: string;
  recommended_tests: RecommendedTest[];
  lifestyle_tips: string[];
  doctor_recommendation: string;
  specialist_referral: string;
  urgency_message: string;
  estimated_savings: string;
  risk_score: number;
  is_new: boolean;
}

export interface AgentPipelineResult {
  claim_id: number;
  pipeline_steps: string[];
  fraud_score?: number;
  fraud_risk_level?: string;
  fast_reject: boolean;
  ai_decision?: string;
  ai_reasoning?: string;
  confidence_score?: number;
  tx_hash?: string;
  total_time_ms: number;
}

export interface ClinicalReviewResponse {
  claim_id: number;
  icd_code: string;
  icd_description: string;
  treatment_protocol: string;
  approval_probability: string;
  clinical_notes: string;
}

// ── LangGraph orchestrator ────────────────────────────────────────
export interface GraphRunResult {
  thread_id: string;
  paused_at: string[];
  is_paused: boolean;
  is_complete: boolean;
  claim_id: number;
  fraud_score?: number | null;
  fraud_indicators?: string[];
  payable_amount?: number | null;
  ai_decision?: string | null;
  ai_reasoning?: string | null;
  confidence?: number | null;
  tx_hash?: string | null;
  error?: string | null;
  audit_trail: string[];
  total_time_ms?: number;
  message?: string;
}

export interface ReviewQueueItem {
  thread_id: string;
  claim_id: number;
  disease?: string;
  claim_amount: number;
  ai_decision?: string | null;
  ai_reasoning?: string | null;
  confidence?: number | null;
  fraud_score?: number | null;
  payable_amount?: number | null;
}

export interface CheckpointStep {
  step: number;
  node: string;
  next: string[];
  decision_so_far?: string | null;
  confidence?: number | null;
  created_at?: string;
}

export interface CheckpointReplay {
  claim_id: number;
  thread_id: string;
  total_checkpoints: number;
  steps: CheckpointStep[];
  audit_trail: string[];
  final: GraphRunResult;
}

// ── Agent economics ───────────────────────────────────────────────
export interface AgentPnl {
  agent_name: string;
  invocations: number;
  revenue_usdt: number;
  compute_cost_usd: number;
  profit_usdt: number;
  avg_latency_ms: number;
  margin_pct: number;
}

export interface PnlResponse {
  agents: AgentPnl[];
  totals: { revenue_usdt: number; compute_cost_usd: number; profit_usdt: number; invocations: number };
  thesis: string;
}

export interface LeaderboardEntry {
  agent_name: string;
  tool_name: string;
  calls: number;
  avg_profit_per_call_usdt: number;
  total_profit_usdt: number;
}

export interface AgentMetrics {
  uptime_seconds: number;
  claims_processed: number;
  graph_runs: number;
  graph_human_pauses: number;
  auto_rejects_rule_engine: number;
  llm_calls: number;
  llm_fallbacks: number;
  llm_tokens_estimated: number;
  blockchain_tx_written: number;
  blockchain_tx_failed: number;
  mcp_invocations: number;
  avg_latency_ms_by_agent: Record<string, number>;
}

export const AgentHttpService = {
  // Health
  getStatus: () => agentApi.get("/agent/status"),

  // ── LangGraph orchestrator (checkpointed, human-in-the-loop) ──
  runGraph: (claimId: number): Promise<{ data: GraphRunResult }> =>
    agentApi.post(`/agent/graph/run/${claimId}`),
  getReviewQueue: (): Promise<{ data: { count: number; queue: ReviewQueueItem[] } }> =>
    agentApi.get("/agent/graph/review-queue"),
  resumeGraph: (
    threadId: string,
    decision?: "Approve" | "Reject",
    notes?: string
  ): Promise<{ data: GraphRunResult }> =>
    agentApi.post(`/agent/graph/resume/${threadId}`, { decision, notes }),
  getCheckpoints: (claimId: number): Promise<{ data: CheckpointReplay }> =>
    agentApi.get(`/agent/graph/checkpoints/${claimId}`),
  getTrace: (claimId: number) => agentApi.get(`/agent/traces/${claimId}`),

  // ── Agent economics ──
  getPnl: (): Promise<{ data: PnlResponse }> => agentApi.get("/agent/economics/pnl"),
  getLeaderboard: (): Promise<{ data: { leaderboard: LeaderboardEntry[] } }> =>
    agentApi.get("/agent/economics/leaderboard"),
  getLedger: (limit = 50) => agentApi.get(`/agent/economics/ledger?limit=${limit}`),

  // ── Observability ──
  getMetrics: (): Promise<{ data: AgentMetrics }> => agentApi.get("/agent/metrics"),

  // Claim Processor — batch (returns full list after all processing)
  processClaims: (): Promise<{ data: ClaimDecision[] }> =>
    agentApi.post("/agent/process-claims"),

  // Claim Processor — SSE stream (real-time per-claim events for terminal)
  streamProcessClaims: (
    onEvent: (event: SSEEvent) => void,
    onComplete: () => void,
    onError: (err: string) => void
  ): (() => void) => {
    const es = new EventSource("http://127.0.0.1:8000/agent/process-claims/stream");

    es.onmessage = (e) => {
      try {
        const data: SSEEvent = JSON.parse(e.data);
        onEvent(data);
        if (data.type === "complete" || data.type === "error") {
          es.close();
          if (data.type === "complete") onComplete();
          else onError(data.message ?? "Agent stream error");
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      onError("Agent SSE connection failed. Is Python agent running on port 8000?");
    };

    // Return cleanup function
    return () => es.close();
  },

  // Fraud Detector — algorithmic 0-100 score
  getFraudScore: (claimId: number): Promise<{ data: FraudScore }> =>
    agentApi.get(`/agent/fraud-score/${claimId}`),

  // Policy Advisor — Gemini-powered recommendation
  recommendPolicy: (
    request: PolicyRecommendationRequest
  ): Promise<{ data: PolicyRecommendation }> =>
    agentApi.post("/agent/recommend-policy", request),

  // Predictive Risk — Autonomous patient scanning
  getPredictiveScan: (): Promise<{ data: RiskScanResult[] }> =>
    agentApi.get("/agent/predictive-scan"),

  // Health Guardian — Personalized 90-day care plans
  getHealthGuardian: (customerId: number): Promise<{ data: CarePlanResponse }> =>
    agentApi.get(`/agent/health-guardian/${customerId}`),

  // Hospital Assistant — Agent 7 (Clinical Claim Optimizer)
  getHospitalAssistant: (claimId: number): Promise<{ data: ClinicalReviewResponse }> =>
    agentApi.get(`/agent/hospital-assistant/${claimId}`),

  // Orchestrator — Full autonomous pipeline for a single claim
  orchestrateClaim: (claimId: number): Promise<{ data: AgentPipelineResult }> =>
    agentApi.post(`/agent/orchestrate/claim/${claimId}`),
};
