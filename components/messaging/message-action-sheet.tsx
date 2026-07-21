'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Reply, Edit, Pin, Forward, Trash2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils/utils';

export interface MessageActionSheetMessage {
  id: string;
  content: string | null;
  isMe: boolean;
  isDeleted?: boolean;
  editedAt?: Date | string | null;
  type: string;
  senderName?: string;
  isPinned?: boolean;
  attachments?: any[];
}

export interface MessageActionSheetProps {
  message: MessageActionSheetMessage | null;
  /** position hint for which side the bubble is on */
  isOpen: boolean;
  onClose: () => void;
  onCopy: () => void;
  onReply: () => void;
  onEdit: () => void;
  onPin: () => void;
  onForward: () => void;
  /** Called with deleteForEveryone flag */
  onDelete: (deleteForEveryone: boolean) => void;
  /** Whether the current user has admin/owner perms to delete for everyone */
  canDeleteForEveryone?: boolean;
}

// ── Action button item type ───────────────────────────────────────────────────
interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isDestructive?: boolean;
  hidden?: boolean;
}

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  message,
  isOpen,
  onClose,
  onCopy,
  onReply,
  onEdit,
  onPin,
  onForward,
  onDelete,
  canDeleteForEveryone = false,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on back-gesture / Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Reset inner dialog when sheet closes
  useEffect(() => {
    if (!isOpen) setShowDeleteDialog(false);
  }, [isOpen]);

  if (!message) return null;

  const isText = message.type === 'TEXT';
  const isPinned = !!(message as any).isPinned;

  const actions: ActionItem[] = [
    {
      id: 'copy',
      label: 'Copy Text',
      icon: <Copy className="h-5 w-5" />,
      hidden: message.isDeleted || !message.content,
      onClick: () => { onCopy(); onClose(); },
    },
    {
      id: 'reply',
      label: 'Reply',
      icon: <Reply className="h-5 w-5" />,
      hidden: !!message.isDeleted,
      onClick: () => { onReply(); onClose(); },
    },
    {
      id: 'edit',
      label: 'Edit Message',
      icon: <Edit className="h-5 w-5" />,
      // Only show for own text messages that aren't deleted
      hidden: !message.isMe || message.isDeleted || !isText,
      onClick: () => { onEdit(); onClose(); },
    },
    {
      id: 'pin',
      label: isPinned ? 'Unpin Message' : 'Pin Message',
      icon: isPinned
        ? <Pin className="h-5 w-5 rotate-45" />
        : <Pin className="h-5 w-5" />,
      hidden: !!message.isDeleted,
      onClick: () => { onPin(); onClose(); },
    },
    {
      id: 'forward',
      label: 'Forward',
      icon: <Forward className="h-5 w-5" />,
      hidden: !!message.isDeleted,
      onClick: () => { onForward(); onClose(); },
    },
    {
      id: 'delete',
      label: message.isMe
        ? 'Delete'
        : 'Delete for Me',
      icon: <Trash2 className="h-5 w-5" />,
      isDestructive: true,
      onClick: () => setShowDeleteDialog(true),
    },
  ].filter(a => !a.hidden);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center">
          {/* Blurred dim backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="sheet"
            ref={sheetRef}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380, mass: 0.8 }}
            className="relative z-10 w-full max-w-lg mx-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Message preview chip at top of sheet */}
            {!message.isDeleted && (message.content || (message.attachments && message.attachments.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04, duration: 0.16 }}
                className="mx-3 mb-2 bg-background/95 backdrop-blur-xl border border-border/60 rounded-2xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    {message.isMe ? 'You' : (message.senderName || 'Message')}
                  </span>
                  {message.editedAt && (
                    <span className="text-[9px] text-muted-foreground/60 italic">edited</span>
                  )}
                </div>
                <p className="text-[13px] text-foreground/90 line-clamp-3 leading-relaxed">
                  {message.content ||
                    (message.attachments?.[0]?.type?.startsWith('image/') ? '📷 Photo'
                      : message.type === 'VIDEO' ? '🎥 Video'
                      : message.type === 'FILE' ? '📎 File'
                      : '📎 Attachment')}
                </p>
              </motion.div>
            )}

            {/* Action list */}
            <div className="mx-3 mb-3 bg-background/98 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl overflow-hidden">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-muted-foreground/20 rounded-full" />
              </div>

              <div className="py-1">
                {actions.map((action, index) => (
                  <React.Fragment key={action.id}>
                    {/* Separator before Delete */}
                    {action.isDestructive && index > 0 && (
                      <div className="mx-4 h-px bg-border/50 my-1" />
                    )}
                    <ActionButton action={action} />
                  </React.Fragment>
                ))}
              </div>

              {/* Bottom safe area padding */}
              <div className="h-2" />
            </div>
          </motion.div>

          {/* Delete confirmation dialog (rendered ON TOP of sheet) */}
          <AnimatePresence>
            {showDeleteDialog && (
              <DeleteConfirmDialog
                isMe={message.isMe}
                canDeleteForEveryone={message.isMe || canDeleteForEveryone}
                onCancel={() => setShowDeleteDialog(false)}
                onDeleteForMe={() => {
                  setShowDeleteDialog(false);
                  onDelete(false);
                  onClose();
                }}
                onDeleteForEveryone={() => {
                  setShowDeleteDialog(false);
                  onDelete(true);
                  onClose();
                }}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};

// ── Individual action row ────────────────────────────────────────────────────
const ActionButton = ({ action }: { action: ActionItem }) => {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      className={cn(
        'w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors duration-100 relative overflow-hidden select-none',
        action.isDestructive
          ? 'text-destructive hover:bg-destructive/8 active:bg-destructive/15'
          : 'text-foreground hover:bg-secondary/60 active:bg-secondary',
        pressed && 'scale-[0.98]'
      )}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => { setPressed(false); action.onClick(); }}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
    >
      {/* Ripple effect */}
      {pressed && (
        <motion.span
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={cn(
            'absolute inset-0 m-auto w-12 h-12 rounded-full pointer-events-none',
            action.isDestructive ? 'bg-destructive/20' : 'bg-foreground/10'
          )}
        />
      )}

      {/* Icon */}
      <span className={cn(
        'shrink-0',
        action.isDestructive ? 'text-destructive' : 'text-foreground/70'
      )}>
        {action.icon}
      </span>

      {/* Label */}
      <span className={cn(
        'text-[15px] font-medium tracking-tight',
        action.isDestructive ? 'text-destructive' : 'text-foreground'
      )}>
        {action.label}
      </span>
    </button>
  );
};

// ── Telegram-style delete confirmation dialog ─────────────────────────────────
interface DeleteConfirmDialogProps {
  isMe: boolean;
  canDeleteForEveryone: boolean;
  onCancel: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isMe,
  canDeleteForEveryone,
  onCancel,
  onDeleteForMe,
  onDeleteForEveryone,
}) => (
  <motion.div
    key="delete-dialog"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 z-20 flex items-center justify-center p-6"
    onClick={(e) => e.stopPropagation()}
  >
    {/* Dialog backdrop */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/40"
      onClick={onCancel}
    />

    {/* Dialog card */}
    <motion.div
      initial={{ scale: 0.88, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.88, opacity: 0, y: 12 }}
      transition={{ type: 'spring', damping: 28, stiffness: 400 }}
      className="relative z-10 bg-background rounded-3xl border border-border/60 shadow-2xl w-full max-w-[320px] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40">
        <h3 className="text-[17px] font-bold text-foreground tracking-tight">
          Delete this message?
        </h3>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
          {canDeleteForEveryone
            ? 'Choose who to delete this message for.'
            : 'This will remove the message from your view.'}
        </p>
      </div>

      {/* Actions */}
      <div className="p-3 flex flex-col gap-1.5">
        {canDeleteForEveryone && (
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors hover:bg-destructive/8 active:bg-destructive/15 group"
            onClick={onDeleteForEveryone}
          >
            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 group-hover:bg-destructive/20 transition-colors">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-destructive">Delete for Everyone</p>
              <p className="text-[11px] text-muted-foreground">Removes for all participants</p>
            </div>
          </button>
        )}

        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors hover:bg-secondary/70 active:bg-secondary group"
          onClick={onDeleteForMe}
        >
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0 group-hover:bg-secondary/80 transition-colors">
            <X className="h-4 w-4 text-foreground/70" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              {canDeleteForEveryone ? 'Delete for Me' : 'Delete'}
            </p>
            <p className="text-[11px] text-muted-foreground">Only removed from your view</p>
          </div>
        </button>

        <button
          className="w-full px-4 py-3 rounded-2xl text-[14px] font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  </motion.div>
);
