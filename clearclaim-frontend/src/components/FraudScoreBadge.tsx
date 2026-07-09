// FraudScoreBadge.tsx — Color-coded fraud risk badge
interface Props {
  score: number | null | undefined;
  showLabel?: boolean;
}

export default function FraudScoreBadge({ score, showLabel = true }: Props) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: "rgba(255,255,255,0.05)", color: "#4A6080" }}>
        — N/A
      </span>
    );
  }

  const isLow = score < 30;
  const isMed = score >= 30 && score < 60;
  const isHigh = score >= 60;

  const color = isLow ? "#00C896" : isMed ? "#FFB800" : "#FF4757";
  const bg = isLow
    ? "rgba(0,200,150,0.12)"
    : isMed
    ? "rgba(255,184,0,0.12)"
    : "rgba(255,71,87,0.12)";
  const dot = isLow ? "🟢" : isMed ? "🟡" : "🔴";
  const label = isLow ? "Low" : isMed ? "Medium" : "High";

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: bg, color, border: `1px solid ${color}30` }}
    >
      {dot} {score}
      {showLabel && <span className="opacity-70 ml-0.5">· {label}</span>}
    </span>
  );
}
