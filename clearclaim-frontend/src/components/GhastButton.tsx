// GhastButton.tsx — Ghast/Anima-style pill button
// White bg + black text (light) or black bg + white text (dark)
// Rounded-full, hover scale, clean feel

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "light" | "dark";
  children: ReactNode;
}

export default function GhastButton({ variant = "light", children, className = "", ...props }: Props) {
  return (
    <button
      className={`${variant === "light" ? "btn-ghast" : "btn-ghast-dark"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
