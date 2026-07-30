import CheckoutSimulationPage from "./checkout-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"

export const metadata = createPageMetadata({
  title: "Subscription Checkout Simulation",
  description: "Payment checkout processing portal for Zetime subscriptions.",
  path: "/checkout-simulation",
  noIndex: true,
})

export default function Page() {
  return <CheckoutSimulationPage />
}
