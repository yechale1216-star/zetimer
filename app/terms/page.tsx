"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Scale, AlertCircle, ArrowLeft } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

export default function TermsPage() {
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
            <Scale className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: May 15, 2026</p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Zetime, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">2. Account Responsibility</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. 
              Schools are responsible for ensuring they have the necessary rights to upload student information.
            </p>
          </section>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 mb-10">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-amber-700">Important Usage Policy</h3>
            </div>
            <p className="text-sm text-amber-800/80 leading-relaxed">
              Zetime is intended for legitimate educational and administrative use only. 
              Misuse of student data or unauthorized access to other school databases will result in immediate termination of service.
            </p>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">3. Subscription & Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              Service is provided on a subscription basis. Fees are non-refundable unless otherwise specified. 
              Failure to pay subscription fees may result in temporary suspension of account access.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">4. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Zetime provides the platform "as is" and shall not be liable for any indirect, incidental, 
              or consequential damages arising from the use of our service or loss of data.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4">5. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Significant changes will be notified to 
              account administrators via email or platform announcements.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Need clarification on our terms?
          </p>
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
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
