import { Skeleton } from "@/components/ui/skeleton";

export const ChatListSkeleton = () => {
  return (
    <div className="flex flex-col gap-1 p-2">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl border border-transparent">
          {/* Avatar skeleton */}
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5 min-w-0">
            <div className="flex justify-between items-center gap-2">
              {/* Name skeleton — varied widths for realistic look */}
              <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-32' : i % 3 === 1 ? 'w-24' : 'w-28'}`} />
              {/* Timestamp skeleton */}
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
            {/* Last message skeleton */}
            <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessageWindowSkeleton = () => {
  return (
    <div className="flex-1 flex flex-col p-4 gap-6 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col gap-1 max-w-[70%] ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
              <Skeleton className={`h-10 ${i % 2 === 0 ? 'w-48 rounded-2xl rounded-tr-none' : 'w-64 rounded-2xl rounded-tl-none'}`} />
              <Skeleton className="h-3 w-10 mt-1" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Media Skeleton */}
      <div className="flex justify-start">
        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-border/50 max-w-[60%]">
          <Skeleton className="aspect-video w-[300px] rounded-xl" />
          <div className="mt-2 flex justify-between items-center">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
};
