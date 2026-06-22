import SchoolDetailClient from "./client"

export function generateStaticParams() {
  return [{ id: "placeholder" }]
}

export default function SchoolDetailPage() {
  return <SchoolDetailClient />
}
