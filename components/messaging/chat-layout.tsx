'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ sidebar, content }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-full bg-background overflow-hidden relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-80 lg:w-96 border-r border-border shrink-0">
        {sidebar}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="md:hidden absolute top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {content}
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-[60] md:hidden backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-background z-[70] md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30">
                <h2 className="font-bold text-lg">Chats</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {sidebar}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
