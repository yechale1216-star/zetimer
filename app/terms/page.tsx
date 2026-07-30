import TermsPage from "./terms-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"

export const metadata = createPageMetadata({
  title: "Terms of Service — Institutional Master Agreement",
  description:
    "Review Zetime's Terms of Service governing school administrative responsibilities, messaging networks, and multi-tenant platform usage.",
  path: "/terms",
})

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Terms of Service", href: "/terms" },
        ]}
      />
      <TermsPage />
    </>
  )
}
