import React from "react";
import { cn } from "@/lib/utils/utils";

interface PageSkeletonProps {
  variant: "dashboard" | "table" | "form" | "cards";
  className?: string;
}

export function PageSkeleton({ variant, className }: PageSkeletonProps) {
  const SkeletonItem = ({ className }: { className?: string }) => (
    <div className={cn("bg-card animate-pulse rounded-3xl border border-border/10", className)} />
  );

  switch (variant) {
    case "dashboard":
      return (
        <div className={cn("space-y-6 animate-in fade-in duration-500", className)}>
          {/* Header area */}
          <div className="space-y-2">
            <SkeletonItem className="h-8 w-64" />
            <SkeletonItem className="h-4 w-48" />
          </div>
          
          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonItem className="h-32 w-full" />
            <SkeletonItem className="h-32 w-full" />
            <SkeletonItem className="h-32 w-full" />
            <SkeletonItem className="h-32 w-full" />
          </div>

          {/* Large panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonItem className="h-80 lg:col-span-2" />
            <div className="space-y-4">
               <SkeletonItem className="h-40" />
               <SkeletonItem className="h-40" />
            </div>
          </div>
        </div>
      );

    case "table":
      return (
        <div className={cn("space-y-6 animate-in fade-in duration-500", className)}>
          {/* Action bar and filters */}
          <SkeletonItem className="h-28 w-full" />
          
          {/* Large table block */}
          <SkeletonItem className="h-[500px] w-full" />
        </div>
      );

    case "form":
      return (
        <div className={cn("space-y-8 animate-in fade-in duration-500", className)}>
           {/* Header section */}
           <div className="flex items-center gap-6 p-6 bg-card/60 backdrop-blur-md rounded-3xl border border-border/10 animate-pulse">
             <div className="w-24 h-24 rounded-2xl bg-muted" />
             <div className="space-y-2 flex-1">
               <div className="h-6 w-48 bg-muted rounded-md" />
               <div className="h-4 w-32 bg-muted rounded-md" />
             </div>
           </div>

           {/* Form sections */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <SkeletonItem className="h-96" />
             <SkeletonItem className="h-96" />
           </div>
        </div>
      );

    case "cards":
      return (
        <div className={cn("space-y-6 animate-in fade-in duration-500", className)}>
          {/* Header */}
          <div className="space-y-2">
            <SkeletonItem className="h-8 w-40" />
            <SkeletonItem className="h-4 w-64" />
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonItem key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      );

    default:
      return <SkeletonItem className="h-40 w-full" />;
  }
}
