import SubscriptionDetailClient from "./client"

export function generateStaticParams() {
  return [{ id: "placeholder" }]
}

export default function SubscriptionDetailPage() {
  return <SubscriptionDetailClient />
}
