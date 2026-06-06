import React from "react";

interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 animate-in fade-in duration-500">
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className="absolute w-16 h-16 rounded-full border-4 border-emerald-500/20 animate-ping" />
        
        {/* Main spinning ring */}
        <div className="w-12 h-12 rounded-full border-4 border-t-emerald-600 border-r-transparent border-b-emerald-600/30 border-l-transparent animate-spin" />
        
        {/* Static center dot */}
        <div className="absolute w-2 h-2 bg-emerald-600 rounded-full shadow-[0_0_10px_rgba(5,150,105,0.5)]" />
      </div>
      
      {label && (
        <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse tracking-wide uppercase">
          {label}
        </p>
      )}
    </div>
  );
}
