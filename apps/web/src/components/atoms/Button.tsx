import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = variant === "primary" ? "btn-primary" : "btn-ghost";
  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
