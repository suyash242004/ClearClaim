// StatCard.tsx — Animated count-up stat card with glow
import CountUp from "react-countup";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;   // hex
  prefix?: string;
  suffix?: string;
  delay?: number;
}

export default function StatCard({ label, value, icon: Icon, color, prefix = "", suffix = "", delay = 0 }: Props) {
  // Safe resolution for CountUp component (which can resolve as CJS default object under Vite/ESM)
  const CountUpComp = typeof CountUp === "function" || (CountUp && typeof (CountUp as any).render === "function")
    ? CountUp
    : (CountUp && typeof (CountUp as any).default === "function" ? (CountUp as any).default : null);

  // Safe resolution for Icon component
  const IconComp = typeof Icon === "function" || (Icon && typeof (Icon as any).render === "function")
    ? Icon
    : (Icon && typeof (Icon as any).default === "function" ? (Icon as any).default : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card p-5"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: "#64748B" }}>
            {label}
          </p>
          <p className="text-4xl font-bold" style={{ color: "#F8FAFC" }}>
            {prefix}
            {CountUpComp ? (
              <CountUpComp end={value} duration={1.5} separator="," delay={delay} />
            ) : (
              value.toLocaleString("en-IN")
            )}
            {suffix}
          </p>
        </div>
        <div
          className="p-2.5 rounded-xl"
          style={{ background: `${color}15` }}
        >
          {IconComp ? <IconComp size={20} style={{ color }} /> : null}
        </div>
      </div>
    </motion.div>
  );
}
