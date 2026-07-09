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

export const AgentHttpService = {
  // Health
  getStatus: () => agentApi.get("/agent/status"),

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
};
