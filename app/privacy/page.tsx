"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Lock, Eye, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50 w-full overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs sm:text-sm">Z</span>
              </div>
              <span className="text-lg sm:text-xl font-bold tracking-tight">Zetime</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/about" className="text-xs sm:text-sm font-medium hover:text-primary transition-colors hidden sm:block">
                About
              </Link>
              <div className="scale-90 sm:scale-100">
                <ModeToggle />
              </div>
              <Button asChild size="sm" variant="outline" className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/about" className="inline-flex items-center text-sm text-primary mb-8 hover:underline">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to About
        </Link>
        
        <div className="space-y-4 mb-12">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: June 13, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We collect information to provide better services to our users. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account Information:</strong> Name, email address, phone number, and school details during registration and onboarding.</li>
              <li><strong>Student Data:</strong> Names, grades, and attendance records managed by school administrators.</li>
              <li><strong>Communication Data:</strong> Message history, attachments, and documents shared within the Messaging Center.</li>
              <li><strong>Usage & Offline Data:</strong> Local storage of records for offline functionality and technical logs to improve platform stability.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">2. How We Use Information</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              The data we collect is used solely for maintainting the educational ecosystem, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Processing real-time attendance and academic reporting.</li>
              <li>Facilitating secure communication between staff, parents, and admins.</li>
              <li>Delivering automated SMS and email notifications.</li>
              <li>Ensuring synchronization of data across devices, including offline-to-online transitions.</li>
            </ul>
          </section>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-10">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary">Advanced Security Standards</h3>
            </div>
            <p className="text-sm text-primary/80 leading-relaxed">
              We employ AES-256 encryption for data at rest and TLS 1.3 for data in transit. 
              Our multi-tenant architecture ensures strict data isolation between institutions. 
              We never sell your data to third parties.
            </p>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">3. Data Retention & Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain data for the duration of an active subscription. Schools can request bulk data deletion or exports at any time. 
              Upon subscription termination, data is securely purged after a 30-day grace period, unless otherwise required by law.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">4. PWA & Local Storage</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              To provide offline capabilities, certain data is cached locally in your browser using Service Workers and IndexedDB/LocalStorage. 
              This data remains on your device and is only transmitted to our servers during synchronization.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users have the right to access, correct, or request deletion of their personal data. 
              Administrators have full transparency and control over the student data they manage within the platform.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Questions about our privacy practices?
          </p>
          <Button asChild>
            <Link href="mailto:privacy@zetime.io">Contact Privacy Team</Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Zetime Attendance Tracker. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
