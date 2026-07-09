// ClaimStatusChip.tsx — Status pill for claims
interface Props {
  status: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  Pending: { label: "Pending", color: "#FFB800", bg: "rgba(255,184,0,0.12)" },
  Approved: { label: "Approved", color: "#00C896", bg: "rgba(0,200,150,0.12)" },
  Rejected: { label: "Rejected", color: "#FF4757", bg: "rgba(255,71,87,0.12)" },
  Flag: { label: "Flagged", color: "#FF8C00", bg: "rgba(255,140,0,0.12)" },
  Flagged: { label: "Flagged", color: "#FF8C00", bg: "rgba(255,140,0,0.12)" },
};

export default function ClaimStatusChip({ status }: Props) {
  const cfg = statusConfig[status] ?? { label: status, color: "#6A84A8", bg: "rgba(106,132,168,0.12)" };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}
