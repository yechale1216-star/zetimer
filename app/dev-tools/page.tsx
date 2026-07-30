import DevToolsPage from "./dev-tools-content"
import { createPageMetadata } from "@/lib/seo/metadata-constants"

export const metadata = createPageMetadata({
  title: "Developer Tools",
  description: "Zetime internal developer diagnostics and API debugging interface.",
  path: "/dev-tools",
  noIndex: true,
})

export default function Page() {
  return <DevToolsPage />
}
