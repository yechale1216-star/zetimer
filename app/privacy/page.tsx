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
          <p className="text-muted-foreground">Last updated: May 15, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              We collect information to provide better services to our users. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Account Information:</strong> Name, email address, and school details when you register.</li>
              <li><strong>Student Data:</strong> Names, grades, and attendance records provided by school administrators.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our platform to improve performance.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">2. How We Use Information</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              The data we collect is used solely for the purpose of maintaining the attendance system, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Processing and displaying attendance reports.</li>
              <li>Sending notifications to parents and staff.</li>
              <li>Ensuring the security and integrity of the school database.</li>
            </ul>
          </section>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-10">
            <div className="flex items-center gap-3 mb-3">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-primary">Data Security Commitment</h3>
            </div>
            <p className="text-sm text-primary/80 leading-relaxed">
              We implement industry-standard encryption and security protocols to protect sensitive student and institutional data. 
              We never sell or share your data with third-party advertisers.
            </p>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">3. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain account information and student records for as long as your school maintains an active subscription. 
              Upon request, or after subscription termination, we will securely delete all associated data in accordance with our data management policies.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">4. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users have the right to access, correct, or request deletion of their personal data. 
              Administrators have full control over the student data they manage within the platform.
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
