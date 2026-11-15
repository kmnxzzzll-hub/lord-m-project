import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Quiet typographic wordmark — no glow, no shine. */
export function Logo({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("flex flex-col items-center", className)}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="font-display text-[26px] font-bold leading-none tracking-[0.18em] text-foreground">
        BAC<span className="text-muted-foreground">·</span>BO
      </span>
      <span className="mt-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.45em] text-muted-foreground">
        <span className="h-px w-6 bg-player" />
        Live
        <span className="h-px w-6 bg-banker" />
      </span>
    </motion.div>
  );
}
