import PrivacyPage from "./privacy-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"

export const metadata = createPageMetadata({
  title: "Privacy & Data Protection Policy",
  description:
    "Read Zetime's privacy policy. Learn how we safeguard student attendance records, family information, and institutional data with multi-tenant isolation.",
  path: "/privacy",
})

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Privacy Policy", href: "/privacy" },
        ]}
      />
      <PrivacyPage />
    </>
  )
}
