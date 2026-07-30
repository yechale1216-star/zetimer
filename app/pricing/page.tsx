import PricingPage from "./pricing-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"

export const metadata = createPageMetadata({
  title: "Plans & Pricing — Affordable School Management",
  description:
    "Explore transparent and flexible subscription plans for Zetime school attendance and discipline management. Free 30-day trial available.",
  path: "/pricing",
  keywords: ["school software pricing", "attendance app cost", "Ethiopian school SaaS", "Zetime pricing"],
})

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Pricing", href: "/pricing" },
        ]}
      />
      <PricingPage />
    </>
  )
}
