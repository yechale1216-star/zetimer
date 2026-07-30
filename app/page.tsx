import HomePage from "./home-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"
import { WebApplicationJsonLd } from "@/components/seo/json-ld"

export const metadata = createPageMetadata({
  title: "Smart School Attendance Management System",
  description:
    "Zetime automates attendance tracking, discipline management, and real-time parent notifications for schools across Ethiopia. Start your free trial today.",
  path: "/",
})

export default function Page() {
  return (
    <>
      <WebApplicationJsonLd />
      <HomePage />
    </>
  )
}
