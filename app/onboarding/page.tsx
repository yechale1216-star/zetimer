import OnboardingPage from "./onboarding-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"

export const metadata = createPageMetadata({
  title: "School Onboarding Wizard",
  description: "Set up your institution, grade levels, and academic schedule on Zetime.",
  path: "/onboarding",
  noIndex: true,
})

export default function Page() {
  return <OnboardingPage />
}
