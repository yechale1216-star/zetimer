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
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Desktop Layout or Mobile Sidebar */}
      <div 
        className={cn(
          "flex-col border-r border-border shrink-0 h-full overflow-hidden transition-all duration-300",
          isMobile 
            ? (showContentOnMobile ? "hidden" : "flex w-full") 
            : "flex w-80 lg:w-96"
        )}
      >
        {sidebar}
      </div>

      {/* Main Content Area / Chat Screen */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 relative transition-all duration-300",
          isMobile && !showContentOnMobile ? "hidden" : "flex"
        )}
      >
        {content}
      </div>
    </div>
  );
};

