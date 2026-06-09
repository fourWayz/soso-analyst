"use client";
import clsx from "clsx";

interface Props {
  score: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
}

export default function ScoreBar({ score, label, showValue = true, size = "md" }: Props) {
  const color =
    score >= 75 ? "bg-signal-strong" :
    score >= 60 ? "bg-signal-mild" :
    score >= 40 ? "bg-signal-neutral" :
    score >= 25 ? "bg-signal-weak" :
    "bg-signal-none";

  const textColor =
    score >= 75 ? "text-signal-strong" :
    score >= 60 ? "text-signal-mild" :
    score >= 40 ? "text-signal-neutral" :
    score >= 25 ? "text-signal-weak" :
    "text-signal-none";

  return (
    <div className={clsx("w-full", size === "sm" ? "space-y-0.5" : "space-y-1")}>
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-terminal-text text-xs">{label}</span>}
          {showValue && <span className={clsx("text-xs font-bold", textColor)}>{score}</span>}
        </div>
      )}
      <div className="h-1.5 bg-terminal-muted rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
