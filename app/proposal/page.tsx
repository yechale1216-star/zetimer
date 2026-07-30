import ProposalPage from "./proposal-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"

export const metadata = createPageMetadata({
  title: "Smart School Attendance System — Project Proposal",
  description:
    "Comprehensive project proposal for Zetime's multi-school attendance management platform, offline support, and parent communication network.",
  path: "/proposal",
})

export default function Page() {
  return <ProposalPage />
}
