'use client';

import { Suspense } from 'react';
import { MessagingCenter } from '@/components/messaging/messaging-center';

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={<div>Loading messaging center...</div>}>
      <MessagingCenter />
    </Suspense>
  );
}
