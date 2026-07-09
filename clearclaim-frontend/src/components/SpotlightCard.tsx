// SpotlightCard.tsx — Aceternity-inspired cursor-tracking spotlight card
// Uses onMouseMove to track cursor position relative to card,
// sets --x and --y CSS variables for the radial gradient overlay.
// Pure React + CSS — no external library needed.

import { useRef, type MouseEvent, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function SpotlightCard({ children, className = "", style, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty("--x", `${x}px`);
    ref.current.style.setProperty("--y", `${y}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={`spotlight-card ${className}`}
      style={style}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
