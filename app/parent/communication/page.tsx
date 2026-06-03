'use client';

import { MessagingCenter } from '@/components/messaging/messaging-center';
import { CallProvider } from '@/components/providers/call-provider';

export default function ParentMessagesPage() {
  return (
    <CallProvider>
      <MessagingCenter />
    </CallProvider>
  );
}
