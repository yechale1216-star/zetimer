'use client';

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils/utils';

interface ChatLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  showContentOnMobile?: boolean;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ 
  sidebar, 
  content, 
  showContentOnMobile = false 
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden relative">
      {/* Sidebar: Full width on mobile when no chat is active, fixed width on desktop */}
      <div 
        className={cn(
          "flex flex-col border-r border-border shrink-0 h-full overflow-hidden transition-all duration-300",
          isMobile 
            ? "w-full" 
            : "w-80 lg:w-96"
        )}
      >
        {sidebar}
      </div>

      {/* Main Content (Chat Window): Absolute overlay on mobile, flex-1 on desktop */}
      <div 
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          isMobile 
            ? "fixed inset-0 z-50 bg-background flex flex-col" 
            : "flex-1 flex flex-col min-w-0 relative",
          isMobile && !showContentOnMobile ? "translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
        )}
      >
        {content}
      </div>
    </div>
  );
};

