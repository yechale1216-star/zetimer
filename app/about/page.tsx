import AboutPage from "./about-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"

export const metadata = createPageMetadata({
  title: "About Us — Next-Generation Educational Technology",
  description:
    "Learn how Zetime empowers Ethiopian schools with automated attendance tracking, discipline management, and instant parent communication.",
  path: "/about",
})

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "About Us", href: "/about" },
        ]}
      />
      <AboutPage />
    </>
  )
}
