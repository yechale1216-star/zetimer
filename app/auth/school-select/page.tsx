import SchoolSelectPage from "./school-select-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"

export const metadata = createPageMetadata({
  title: "Select School",
  description: "Select an institution to access your school portal.",
  path: "/auth/school-select",
  noIndex: true,
})

export default function Page() {
  return <SchoolSelectPage />
}
