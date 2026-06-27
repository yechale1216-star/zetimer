"use client"

import React from "react"
import { cn } from "@/lib/utils/utils"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"

interface MobileCardProps {
  title: string
  subtitle?: string
  avatar?: React.ReactNode
  icon?: React.ReactNode
  status?: React.ReactNode
  onClick?: () => void
  actions?: React.ReactNode
  metadata?: React.ReactNode
  className?: string
}

export function MobileCard({
  title,
  subtitle,
  avatar,
  icon,
  status,
  onClick,
  actions,
  metadata,
  className
}: MobileCardProps) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={cn(
        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/[0.25] rounded-3xl p-5 shadow-xl transition-all active:scale-[0.97] group select-none relative overflow-hidden",
        "dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />
      <div className="flex items-center gap-3">
        {/* Left Side: Avatar or Icon */}
        {(avatar || icon) && (
          <div className="shrink-0">
            {avatar ? (
              <div className="h-12 w-12 rounded-full overflow-hidden border border-border shadow-sm">
                {avatar}
              </div>
            ) : (
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                {icon}
              </div>
            )}
          </div>
        )}

        {/* Center: Title & Subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-black tracking-tight text-foreground truncate uppercase">
              {title}
            </h3>
            {status}
          </div>
          {subtitle && (
            <p className="text-[11px] font-bold text-muted-foreground/60 truncate uppercase tracking-tight">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Side: Actions or Chevron */}
        <div className="shrink-0 flex items-center gap-2">
          {actions}
          {onClick && !actions && (
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          )}
        </div>
      </div>

      {/* Bottom: Metadata/Extra Info */}
      {metadata && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          {metadata}
        </div>
      )}
    </motion.div>
  )
}

export function MobileCardList({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {children}
    </div>
  )
}
