import React from "react"
import CallCenterClientLayout from "@/components/school/call-center-client-layout"
import { createPageMetadata } from "@/lib/seo/metadata-constants"

export const metadata = createPageMetadata({
  title: "Call Center Portal",
  description: "Manage inbound & outbound parent communication queues and call logs.",
  path: "/school/call-center",
  noIndex: true,
})

export default function CallCenterOfficerLayout({ children }: { children: React.ReactNode }) {
  return <CallCenterClientLayout>{children}</CallCenterClientLayout>
}
