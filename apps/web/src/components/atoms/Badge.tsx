interface BadgeProps {
  label: string;
  tone?: "success" | "warning" | "neutral";
  "data-testid"?: string;
}

const tones = {
  success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  warning: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  neutral: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

export function Badge({ label, tone = "neutral", ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
      role="status"
      {...rest}
    >
      {label}
    </span>
  );
}
