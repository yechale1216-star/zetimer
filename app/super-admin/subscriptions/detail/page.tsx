import { Suspense } from "react"
import { SubscriptionDetailView } from "./client"

export default function SubscriptionDetailPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <span className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
        Loading...
      </div>
    }>
      <SubscriptionDetailView />
    </Suspense>
  )
}
