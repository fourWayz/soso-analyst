import clsx from "clsx";
import type { ConvictionSignal } from "@/lib/types";

const CONFIG: Record<ConvictionSignal["direction"], { label: string; class: string }> = {
  STRONG_BUY:  { label: "▲▲ STRONG BUY",  class: "text-signal-strong border-signal-strong bg-signal-strong/10" },
  BUY:         { label: "▲ BUY",           class: "text-signal-mild border-signal-mild bg-signal-mild/10" },
  NEUTRAL:     { label: "◆ NEUTRAL",       class: "text-signal-neutral border-signal-neutral bg-signal-neutral/10" },
  SELL:        { label: "▼ SELL",          class: "text-signal-weak border-signal-weak bg-signal-weak/10" },
  STRONG_SELL: { label: "▼▼ STRONG SELL",  class: "text-signal-none border-signal-none bg-signal-none/10" },
};

export default function DirectionBadge({ direction }: { direction: ConvictionSignal["direction"] }) {
  const { label, class: cls } = CONFIG[direction];
  return (
    <span className={clsx("text-xs font-bold border px-2 py-0.5 rounded", cls)}>
      {label}
    </span>
  );
}
