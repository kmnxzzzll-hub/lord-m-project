import { useEffect } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bot, History, UserRound, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/robos", label: "Robôs", icon: Bot },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/banca", label: "Banca", icon: Wallet },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const router = useRouter();

  // Load every tab's page in the background right after sign-in, so even the first tap is instant.
  useEffect(() => {
    const t = setTimeout(() => {
      for (const { to } of items) void router.preloadRoute({ to }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-md px-3.5 pb-safe sm:px-4">
        <div className="glass flex items-center justify-around rounded-[1.4rem] bg-background/70 px-1.5 py-1.5 sm:rounded-[1.6rem] sm:px-2 sm:py-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 sm:py-2"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl bg-foreground/[0.07] ring-1 ring-foreground/10"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative h-[18px] w-[18px] transition-colors sm:h-5 sm:w-5",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "relative text-[10px] font-semibold sm:text-[11px] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
